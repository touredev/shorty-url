const express = require('express');
const monk = require('monk');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const yup = require('yup');

const {
  nanoid
} = require('nanoid');
require('dotenv').config();
const db = monk(process.env.MONGO_URI);
const urls = db.get('urls');
urls.createIndex({
  slug: 1
}, {
  unique: true
});

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));

const schema = yup.object().shape({
  slug: yup.string().trim().matches(/[\w\-]/i, {
    excludeEmptyString: true
  }),
  url: yup.string().trim().url().required()
});

app.get('/url/:id', async (req, res) => {
  const {
    id: slug
  } = req.params;
  try {
    const url = await urls.findOne({
      slug
    });
    if (url) res.redirect(url.url);
    res.redirect(`/error=${slug} not found.`);
  } catch (error) {
    res.redirect('/error=Link not found.');
  }

});

app.post('/url', async (req, res, next) => {
  let {
    slug,
    url
  } = req.body;
  try {
    await schema.validate({
      slug,
      url
    });

    if (!slug) {
      slug = nanoid(5);
    } else {
      const existing = await urls.findOne({
        slug
      });
      if (existing) throw new Error('Slug already used 🥮 .');
    }
    slug = slug.toLowerCase();
    const newUrl = await urls.insert({
      slug,
      url
    });
    res.json(newUrl);
  } catch (error) {
    next(error);
  }

});

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  console.log(error.message, '🐛 ');
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? '🔥' : error.stack
  })
});

const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port} 🛫 `);
})