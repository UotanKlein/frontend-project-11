import './index.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import 'bootstrap/dist/css/bootstrap-utilities.min.css';
import 'bootstrap/dist/css/bootstrap.css';
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle.js';
import onChange from 'on-change';
import * as yup from 'yup';
import i18n from 'i18next';
import axios from 'axios';
import translations from './translations.js';

const initI18n = () => i18n.init({
    lng: 'ru',
    resources: translations,
    useLocalStorage: true,
    useDataAttrOptions: true,
    interpolation: {
        escapeValue: false,
    },
});

const schema = yup.object({
    input: yup.string().url().required(),
});

const validateForm = async (obj) => {
    try {
        await schema.validate(obj);
    } catch (error) {
        throw new Error('Invalid input URL');
    }
};

const initSite = () => {
    const state = {
        elements: {
            form: document.querySelector('#rss-form'),
            input: document.querySelector('#url-input'),
            button: document.querySelector('#add-btn'),
            statusP: document.querySelector('#status-feedback'),
            title: document.querySelector('#title'),
            subtitle: document.querySelector('#subtitle'),
            example: document.querySelector('#example'),
            feeds: document.querySelector('#feeds'),
            posts: document.querySelector('#posts'),
            modalLabel: document.querySelector('#modalLabel'),
            modalBodyText: document.querySelector('#modal-body-text'),
            readFull: document.querySelector('#read-full'),
            closeBtn: document.querySelector('#close-btn'),
            modal: new bootstrap.Modal(document.getElementById('modal')),
        },
        status: 'none',
        input: null,
        update: false,
        timer: null,
        feeds: {},
        posts: {},
    };

    state.elements.modal.hide();

    const watchedObject = onChange(state, (path, value) => {
        if (path === 'input') {
            if (value === '') {
                return;
            }

            if (state.feeds[value]) {
                state.mapping.alreadyExistsRSS();
                return;
            }

            updateRSS(value);
        }

        if (path === 'update') {
            setTimer();
        }
    });

    state.mapping = {
        changeTexts: () => {
            const { elements } = state;
            elements.title.textContent = i18n.t('title');
            elements.subtitle.textContent = i18n.t('subtitle');
            elements.example.textContent = i18n.t('example');
            elements.button.textContent = i18n.t('button');
            state.elements.readFull.textContent = i18n.t('readFull');
            state.elements.closeBtn.textContent = i18n.t('close');
            elements.input.setAttribute('placeholder', i18n.t('input'));
        },
        updateStatus: (text, addClass, removeClass) => {
            const { elements } = state;
            elements.statusP.textContent = i18n.t(text);
            elements.statusP.classList.remove(removeClass);
            elements.statusP.classList.add(addClass);
            state.status = addClass;
            if (text === 'valid') {
                elements.input.classList.remove('is-invalid');
                elements.input.classList.add('is-valid');
            } else if (text === 'invalidLink' || text === 'RSSAlreadyExists') {
                elements.input.classList.remove('is-valid');
                elements.input.classList.add('is-invalid');
            }
        },
        invalidLink: () => {
            state.mapping.updateStatus('invalidLink', 'text-danger', 'text-success');
        },
        invalidRSS: () => {
            state.mapping.updateStatus('invalidRSS', 'incomplete', 'complete');
        },
        alreadyExistsRSS: () => {
            state.mapping.updateStatus('RSSAlreadyExists', 'text-danger', 'text-success');
        },
        valid: () => {
            state.mapping.updateStatus('valid', 'text-success', 'text-danger');
            watchedObject.update = true;
        },
    };

    async function updateRSS(value) {
        try {
            await validateForm({ input: value });
            const url = encodeURIComponent(value);
            const res = await axios.get(`https://allorigins.hexlet.app/get?url=${url}&disableCache=true`);
            const parser = new DOMParser();
            const domRss = parser.parseFromString(res.data.contents, 'text/xml');
            const rssElement = domRss.querySelector('rss');
            if (!rssElement) {
                state.mapping.invalidRSS();
                return;
            }
            const channel = domRss.querySelector('channel');
            const feedTitle = channel.querySelector('title').textContent;
            const feedDescription = channel.querySelector('description').textContent;
            const items = domRss.querySelectorAll('item');
            render(feedTitle, feedDescription, items, value);
        } catch (error) {
            state.mapping.invalidLink();
        }
    }

    function setTimer() {
        if (watchedObject.update) {
            watchedObject.timer = setTimeout(() => {
                Object.keys(state.feeds).forEach((url) => updateRSS(url));
                setTimer();
            }, 20000);
        } else if (watchedObject.timer !== null) {
            clearTimeout(watchedObject.timer);
            watchedObject.timer = null;
        }
    }

    function render(title, desc, items, url) {
        const createFeedElement = (feedTitle, feedDesc) => {
            const feedElement = document.createElement('li');
            feedElement.classList.add('list-group-item', 'border-0');

            const titleElement = document.createElement('h3');
            titleElement.className = 'm-0 h6';
            titleElement.textContent = feedTitle;

            const descElement = document.createElement('p');
            descElement.className = 'm-0 small text-black-50';
            descElement.textContent = feedDesc;

            feedElement.appendChild(titleElement);
            feedElement.appendChild(descElement);

            return feedElement;
        };

        const createListItem = (itemTitle, link, descItem) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
            const linkElement = document.createElement('a');
            linkElement.href = link;
            linkElement.className = 'fw-bold';
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.textContent = itemTitle;
            linkElement.read = () => {
                linkElement.classList.remove('fw-bold');
                linkElement.classList.add('fw-normal', 'link-secondary');
            };

            const buttonElement = document.createElement('button');
            buttonElement.type = 'button';
            buttonElement.className = 'btn btn-outline-primary btn-sm';
            buttonElement.setAttribute('data-bs-toggle', 'modal');
            buttonElement.setAttribute('data-bs-target', '#modal');
            buttonElement.textContent = i18n.t('view');

            listItem.appendChild(linkElement);
            listItem.appendChild(buttonElement);

            linkElement.addEventListener('click', () => {
                linkElement.read();
            });

            buttonElement.addEventListener('click', () => {
                const myModal = state.elements.modal;
                state.elements.modalLabel.textContent = itemTitle;
                state.elements.modalBodyText.textContent = descItem;
                state.elements.readFull.setAttribute('href', link);
                state.elements.readFull.textContent = i18n.t('readFull');
                myModal.show();
                linkElement.read();
            });

            return listItem;
        };

        const { posts, feeds } = state.elements;

        let postContent = posts.querySelector('.card');

        if (!postContent) {
            postContent = document.createElement('div');
            postContent.className = 'card border-0';
            postContent.innerHTML = `<div class="card-body"><h2 class="card-title h4">${i18n.t('posts')}</h2></div>`;

            const ulPosts = document.createElement('ul');
            ulPosts.classList.add('list-group', 'border-0', 'rounded-0');
            postContent.appendChild(ulPosts);
            posts.appendChild(postContent);
        }

        let feedsContent = state.elements.feeds.querySelector('.card');

        if (!feedsContent) {
            feedsContent = document.createElement('div');
            feedsContent.className = 'card border-0';
            feedsContent.innerHTML = `<div class="card-body"><h2 class="card-title h4">${i18n.t('feeds')}</h2></div>`;

            const ulFeed = document.createElement('ul');
            ulFeed.classList.add('list-group', 'border-0', 'rounded-0');
            feedsContent.appendChild(ulFeed);

            feeds.appendChild(feedsContent);
        }

        const ulPosts = postContent.querySelector('.list-group');
        const ulFeed = feedsContent.querySelector('.list-group');

        if (!state.feeds[url]) {
            const feedElement = createFeedElement(title, desc);
            ulFeed.appendChild(feedElement);
            state.feeds[url] = true;
        }

        items.forEach((item) => {
            const itemTitle = item.querySelector('title').textContent;
            const link = item.querySelector('link').textContent;

            if (!state.posts[link]) {
                const descItem = item.querySelector('description').textContent;
                const listItem = createListItem(itemTitle, link, descItem);
                ulPosts.appendChild(listItem);

                state.posts[link] = true;
            }
        });

        state.mapping.valid();
    }

    state.elements.form.addEventListener('submit', (event) => {
        event.preventDefault();

        const rssInput = state.elements.input;
        const valueInput = rssInput.value;
        watchedObject.input = valueInput;
        rssInput.value = '';
        watchedObject.input = '';
    });

    const updateLanguageKeys = (lng) => {
        state.mapping.changeTexts(lng);
        if (state.status !== 'none') {
            state.mapping[state.status]();
        }
    };

    i18n.on('languageChanged', updateLanguageKeys);

    updateLanguageKeys(i18n.language);
};

document.addEventListener('DOMContentLoaded', () => {
    initI18n().then(() => {
        initSite();
    });
});
