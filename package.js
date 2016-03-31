Package.describe({
  name: 'ox2:forms',
  summary: 'TESTING_DO_NOT_USE Form components',
  version: '1.7.0',
  git: ' /* Fill me in! */ '
});

var S = 'server';
var C = 'client';
var CS = [C, S];

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.2');
  // Core
  api.use([
    'templating',
    'less'
    ]);
  // 3rd party
  api.use([
    'mquandalle:jade@0.4.9','vazco:universe-html-purifier@1.2.3', 'ox2:inject-style@1.0.0'
    ]);
  api.addFiles('lib/oo-forms.jade', C);
  api.addFiles('lib/oo-forms.js', C);
  api.addFiles('lib/oo-forms-theming.js', C);
  api.addFiles('lib/oo-forms.less', C);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('ox2:forms');
  api.addFiles('tests/oo-forms-tests.js');
});
