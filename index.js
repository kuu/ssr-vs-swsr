'use strict';

var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    Handlebars = require('handlebars');

var app = express(),
    port = process.env.PORT || 8080,
    BASE_DIR = path.join(__dirname, '.'),
    DOCS_DIR = path.join(BASE_DIR, 'www'),
    TEMPLATE_DIR = path.join(BASE_DIR, 'template'),
    SSR_TEMPLATE_PATH = path.join(TEMPLATE_DIR, 'ssr.tpl.html'),
    SWSR_TEMPLATE_PATH = path.join(TEMPLATE_DIR, 'swsr.tpl.html'),
    renderPage = Handlebars.compile(
      fs.readFileSync(
        SSR_TEMPLATE_PATH,
        {encoding: 'utf8'}
      )
    );

function getRandomValues() {
  var a = Math.floor(Math.random() * 6) + 1,
      b = Math.floor(Math.random() * 6) + 1,
      c = Math.floor(Math.random() * 6) + 1;
  return {
    valueA: a,
    valueB: b,
    valueC: c
  };
}

app.use(express.static(DOCS_DIR));

app.get('/ssr', function (req, res) {
  // For Server-Side rendering.
  var obj = getRandomValues();
  obj.place = 'Server';
  obj.script = '';
  res.send(renderPage(obj));
});

app.get('/swsr', function (req, res) {
  // For Service-Worker-Side rendering.
  res.sendFile(SWSR_TEMPLATE_PATH);
});

app.get('/api/random', function (req, res) {
  // For Service-Worker-Side rendering.
  res.json(getRandomValues());
});

// Start server
if (require.main === module) {
  console.log('Server listening on port %s', port);
  app.listen(port);
}

module.exports = app;
