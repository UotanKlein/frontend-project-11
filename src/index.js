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
      form: document.querySelector('.rss-form'),
      input: document.querySelector('#url-input'),
      button: document.querySelector('.btn'),
      statusP: document.querySelector('.feedback'),
      title: document.querySelector('.title'),
      subtitle: document.querySelector('.subtitle'),
      example: document.querySelector('.example'),
      feeds: document.querySelector('#feeds'),
      posts: document.querySelector('#posts'),
      modalLabel: document.querySelector('#modalLabel'),
      modalBodyText: document.querySelector('#modal-body-text'),
      readFull: document.querySelector('#readFull'),
      closeBtn: document.querySelector('#close-btn'),
    },
    status: 'none',
    input: null,
    update: false,
    timer: null,
  };

  const watchedObject = onChange(state, (path, value) => {
    if (path === 'input') {
      updateRSS(value);
    }

    if (path === 'update') {
      setTimer();
    }
  });

  const mapping = {
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
      if (addClass === 'valid') {
        elements.input.classList.remove('invalid');
        elements.input.classList.add('valid');
      } else if (addClass === 'invalid') {
        elements.input.classList.remove('valid');
        elements.input.classList.add('invalid');
      }
    },
    invalidLink: () => {
      mapping.updateStatus('invalidLink', 'incomplete', 'complete');
      watchedObject.update = false;
    },
    invalidRSS: () => {
      mapping.updateStatus('invalidRSS', 'incomplete', 'complete');
      watchedObject.update = false;
    },
    valid: () => {
      mapping.updateStatus('valid', 'complete', 'incomplete');
      watchedObject.update = true;
    },
  };

  async function updateRSS(value) {
    try {
      await validateForm({ input: value });
      const res = await axios.get(`https://allorigins.hexlet.app/get?url=${encodeURIComponent(value)}`);
      const parser = new DOMParser();
      const domRss = parser.parseFromString(res.data.contents, 'text/xml');
      const rssElement = domRss.querySelector('rss');
      if (!rssElement) {
        mapping.invalidRSS();
        return;
      }
      const channel = domRss.querySelector('channel');
      const feedTitle = channel.querySelector('title').textContent;
      const feedDescription = channel.querySelector('description').textContent;
      const items = domRss.querySelectorAll('item');
      render(feedTitle, feedDescription, items);
    } catch (error) {
      console.error(error.message);
      mapping.invalidLink();
    }
  }

  function setTimer() {
    if (watchedObject.update) {
      watchedObject.timer = setTimeout(() => {
        updateRSS(watchedObject.input);
        setTimer();
      }, 20000);
    } else if (watchedObject.timer !== null) {
      clearTimeout(watchedObject.timer);
      watchedObject.timer = null;
    }
  }

  function render(title, desc, items) {
    const createFeedElement = (feedTitle, feedDesc) => {
      const feedElement = document.createElement('li');
      feedElement.classList.add('list-group-item', 'border-0');
      feedElement.innerHTML = `
        <h3 class="h6 mg-0">${feedTitle}</h3>
        <p class="m-0 small text-black-50">${feedDesc}</p>
      `;
      return feedElement;
    };

    const createListItem = (itemTitle, link, descItem) => {
      const listItem = document.createElement('li');
      listItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0');
      listItem.innerHTML = `
        <div class="d-flex jc-sb">
          <a class="a-test" href="${link}">${itemTitle}</a>
          <button class="btn-sm btn-outline-primary btn" type="button">${i18n.t('view')}</button>
        </div>
      `;
      listItem.querySelector('button').addEventListener('click', () => {
        const myModal = new bootstrap.Modal(document.getElementById('modal'));
        state.elements.modalLabel.textContent = itemTitle;
        state.elements.modalBodyText.textContent = descItem;
        state.elements.readFull.setAttribute('href', link);
        state.elements.readFull.textContent = i18n.t('readFull');
        myModal.toggle();
      });
      return listItem;
    };

    const postContent = document.createElement('div');
    postContent.className = 'card border-0';
    postContent.innerHTML = `<div class="card-body"><h2 class="card-title h4">${i18n.t('posts')}</h2></div>`;

    const feedsContent = document.createElement('div');
    feedsContent.className = 'card border-0';
    feedsContent.innerHTML = `<div class="card-body"><h2 class="card-title h4">${i18n.t('feeds')}</h2></div>`;

    const ulFeed = document.createElement('ul');
    ulFeed.classList.add('list-group', 'border-0', 'rounded-0');
    const feedElement = createFeedElement(title, desc);
    ulFeed.appendChild(feedElement);
    feedsContent.appendChild(ulFeed);

    const ul = document.createElement('ul');
    items.forEach((item) => {
      const itemTitle = item.querySelector('title').textContent;
      const link = item.querySelector('link').textContent;
      const descItem = item.querySelector('description').textContent;
      const listItem = createListItem(itemTitle, link, descItem);
      ul.appendChild(listItem);
    });

    postContent.appendChild(ul);

    state.elements.posts.innerHTML = '';
    state.elements.posts.appendChild(postContent);

    state.elements.feeds.innerHTML = '';
    state.elements.feeds.appendChild(feedsContent);

    mapping.valid();
  }

  state.elements.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const valueInput = state.elements.input.value;
    watchedObject.input = valueInput;
  });

  const updateLanguageKeys = (lng) => {
    mapping.changeTexts(lng);
    if (state.status !== 'none') {
      mapping[state.status]();
    }
  };

  i18n.on('languageChanged', updateLanguageKeys);

  updateLanguageKeys(i18n.language);
};

document.addEventListener('DOMContentLoaded', () => {
  initI18n().then(() => {
    initSite();

    const myModal = new bootstrap.Modal(document.getElementById('modal'));
    myModal.hide();
  });
});
