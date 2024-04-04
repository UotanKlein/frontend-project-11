/* eslint-disable linebreak-style */
// eslint-disable-next-line import/no-unresolved
import './index.css';
import 'bootstrap/dist/css/bootstrap-grid.min.css';
import 'bootstrap/dist/css/bootstrap-utilities.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import onChange from 'on-change';
import * as yup from 'yup';
import i18n from 'i18next';
import axios from 'axios';

const translations = {
  ru: {
    translation: {
      title: 'RSS агрегатор',
      subtitle: 'Начните читать RSS сегодня! Это легко, это красиво.',
      example: 'Пример: https://lorem-rss.hexlet.app/feed',
      button: 'Добавить',
      invalidRSS: 'Ресурс не содержит валидный RSS',
      invalidLink: 'Ссылка должна быть валидным URL',
      valid: 'RSS успешно загружен',
      input: 'Cсылка RSS',
      posts: 'Посты',
      feeds: 'Фиды',
      view: 'Просмотр',
    }
  },
  en: {
    translation: {
      title: 'RSS aggregator',
      subtitle: 'Start reading RSS today! It\'s easy, it\'s beautiful.',
      example: 'Example: https://lorem-rss.hexlet.app/feed',
      button: 'Add',
      invalidRSS: 'The resource does not contain a valid RSS',
      invalidLink: 'The link must be a valid URL',
      valid: 'RSS successfully loaded',
      input: 'RSS link',
      posts: 'Posts',
      feeds: 'Feeds',
      view: 'View',
    }
  }
};

const runApp = async () => {
  await i18n.init({
    lng: 'ru',
    resources: translations,
    useLocalStorage: true,
    useDataAttrOptions: true,
    interpolation: {
      escapeValue: false,
    }
  });
};

runApp();

const schema = yup.object({
  input: yup.string().url().required(),
});

const validateForm = (obj) => schema.validate(obj);

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
    },
    status: 'none', // valid, invalidRSS, invalidLink, none
    input: null,
  };

  const mapping = {
    changeTexts: () => {
      state.elements.title.textContent = i18n.t('title');
      state.elements.subtitle.textContent = i18n.t('subtitle');
      state.elements.example.textContent = i18n.t('example');
      state.elements.button.textContent = i18n.t('button');
      state.elements.input.setAttribute('placeholder', i18n.t('input'));
    },
    invalidLink: () => {
      state.elements.statusP.textContent = i18n.t('invalidLink');
      state.elements.statusP.classList.remove('complete');
      state.elements.statusP.classList.add('incomplete');
      state.elements.input.classList.remove('valid');
      state.elements.input.classList.add('invalid');
      state.status = 'invalidLink';
    },
    invalidRSS: () => {
      state.elements.statusP.textContent = i18n.t('invalidRSS');
      state.elements.statusP.classList.remove('complete');
      state.elements.statusP.classList.add('incomplete');
      state.elements.input.classList.remove('invalid');
      state.elements.input.classList.add('valid');
      state.status = 'invalidRSS';
    },
    valid: () => {
      state.elements.statusP.textContent = i18n.t('valid');
      state.elements.statusP.classList.remove('incomplete');
      state.elements.statusP.classList.add('complete');
      state.elements.input.classList.remove('invalid');
      state.elements.input.classList.add('valid');
      state.status = 'valid';
    },
  };

  const render = (title, desc, items) => {
    const postContent = document.createElement('div');
    postContent.classList.add('card', 'border-0');
    const cardPostTitle = document.createElement('div');
    const postTitle =  document.createElement('h2');
    postTitle.textContent = i18n.t('posts');
    cardPostTitle.append(postTitle);
    postContent.append(cardPostTitle);

    const feedsContent = document.createElement('div');
    feedsContent.classList.add('card', 'border-0');
    const cardFeedTitle = document.createElement('div');
    const feedTitle =  document.createElement('h2');
    feedTitle.textContent = i18n.t('feeds');
    cardFeedTitle.append(feedTitle);
    feedsContent.append(cardFeedTitle);

    const ulFeed = document.createElement('ul')
    const liFeed = document.createElement('li');
    const liFeedTitle = document.createElement('h3');
    liFeedTitle.textContent = title;
    const liFeedDesc = document.createElement('p');
    liFeedDesc.textContent = desc;
    liFeed.append(liFeedTitle, liFeedDesc);

    ulFeed.append(liFeed);
    feedsContent.append(ulFeed);

    const ul = document.createElement('ul');

    items.forEach(item => {
      const title = item.querySelector('title').textContent;
      const link = item.querySelector('link').textContent;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.setAttribute('href', link);
      a.textContent = title;
      li.append(a);
      ul.append(li);
    });

    postContent.append(ul);

    state.elements.posts.append(postContent)
    state.elements.feeds.append(feedsContent)

    mapping.valid();
  }

  const watchedObject = onChange(state, (path, value) => {
    if (path === 'input') {
      validateForm({ input: value })
        .then((validatedData) => {
          axios.get(`https://allorigins.hexlet.app/get?url=${encodeURIComponent(validatedData.input)}`).then((res) => {
            const parser = new DOMParser();
            const domRss = parser.parseFromString(res.data.contents, 'text/xml');
            const rssElement = domRss.querySelector('rss');
            if (!rssElement) {
              mapping.invalidRSS();
            }
            const channel = domRss.querySelector('channel');
            const feedTitle = channel.querySelector('title').textContent;
            const feedDescription = channel.querySelector('description').textContent;
            const items = domRss.querySelectorAll('item');
            render(feedTitle, feedDescription, items);
          }).catch((error) => console.error(error.message));
        })
        .catch(() => {
          mapping.invalidLink();
        });
    }
  });

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
  
  i18n.on('languageChanged', (lng) => {
    updateLanguageKeys(lng);
  });
  
  updateLanguageKeys(i18n.language);
};

document.addEventListener('DOMContentLoaded', () => {
  initSite();
});
