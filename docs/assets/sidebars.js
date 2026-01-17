/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'index',

    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['use-cases', 'cookbook'],
    },

    {
      type: 'category',
      label: 'Core Concepts',
      items: ['models', 'fields', 'requests', 'filtering'],
    },

    {
      type: 'category',
      label: 'Working with Data',
      items: ['transactions', 'cache', 'hooks'],
    },

    {
      type: 'category',
      label: 'Advanced Patterns',
      items: ['mixins', 'inheritance', 'custom-fields', 'relational-filters'],
    },

    {
      type: 'category',
      label: 'Reference',
      items: ['api-reference'],
    },

    {
      type: 'category',
      label: 'Migration Guides',
      items: ['adoption-sequelize'],
    },
  ],
};

module.exports = sidebars;
