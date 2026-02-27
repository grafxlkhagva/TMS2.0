import { Node, mergeAttributes } from '@tiptap/core';

export interface PlaceholderAttrs {
  source: string;
  path: string;
  label: string;
  fieldType?: string;
  options?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    templatePlaceholder: {
      insertPlaceholder: (attrs: PlaceholderAttrs) => ReturnType;
    };
  }
}

export const TemplatePlaceholder = Node.create({
  name: 'templatePlaceholder',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      source: { default: '' },
      path: { default: '' },
      label: { default: '' },
      fieldType: { default: 'text' },
      options: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-placeholder]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-placeholder': '',
        'data-source': HTMLAttributes.source,
        'data-path': HTMLAttributes.path,
        'data-field-type': HTMLAttributes.fieldType || 'text',
        'data-options': HTMLAttributes.options || '',
        class: `placeholder-chip placeholder-${HTMLAttributes.source}`,
      }),
      `{{${HTMLAttributes.label}}}`,
    ];
  },

  addCommands() {
    return {
      insertPlaceholder:
        (attrs: PlaceholderAttrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
