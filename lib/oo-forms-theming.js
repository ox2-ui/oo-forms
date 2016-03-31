Meteor.startup(() => {
  const applyThemeStyles = (theme = []) => {
    const rules = [];
    for (const item of theme) {
      rules.push(`
input[oo~="${item.location}"]:focus {
  border-color: ${item.color};
}
`);
    }
    ooInjectStyle(rules, 'forms');
  };

  Tracker.autorun(() => {
    applyThemeStyles(Session.get('ooTheme'));
  });
});
