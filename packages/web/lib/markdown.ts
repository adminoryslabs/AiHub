// Utilidades para renderizar markdown a HTML en el servidor
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import rehypePrettyCode from 'rehype-pretty-code';
import { visit } from 'unist-util-visit';
import { slug as githubSlug } from 'github-slugger';
import type { Plugin } from 'unified';
import type { Root, Element, Text } from 'hast';

// Plugin rehype: convierte bloques mermaid en divs para renderizado client-side
const rehypeMermaidBlocks: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (
      node.tagName === 'pre' &&
      node.children.length === 1 &&
      (node.children[0] as Element).type === 'element' &&
      (node.children[0] as Element).tagName === 'code'
    ) {
      const codeNode = node.children[0] as Element;
      const classes = (codeNode.properties?.className as string[]) || [];
      if (!classes.includes('language-mermaid')) return;

      const textContent = codeNode.children
        .filter((c) => c.type === 'text')
        .map((c) => (c as Text).value)
        .join('');

      // Reemplazar el pre con un div.mermaid
      node.tagName = 'div';
      node.properties = { className: ['mermaid'] };
      node.children = [{ type: 'text', value: textContent }];
    }
  });
};

// Eliminar el bloque de frontmatter YAML del markdown antes de procesar
function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---')) return markdown;
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 4).trimStart();
}

// Procesar markdown y devolver HTML como string
export async function markdownToHtml(markdown: string): Promise<string> {
  const clean = stripFrontmatter(markdown);

  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeMermaidBlocks)
    // Sanitizar: permitir id (para rehype-slug), className y atributos de código
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        '*': [...(defaultSchema.attributes?.['*'] || []), 'id'],
        code: [...(defaultSchema.attributes?.code || []), 'className'],
        span: [...(defaultSchema.attributes?.span || []), 'className'],
        div: [...(defaultSchema.attributes?.div || []), 'className', 'data*'],
        pre: [...(defaultSchema.attributes?.pre || []), 'className'],
      },
    })
    // Syntax highlighting con Shiki — corre después de sanitize para que sus
    // estilos inline y data-* no sean eliminados
    .use(rehypePrettyCode, {
      theme: {
        light: 'github-light',
        dark: 'github-dark-dimmed',
      },
      keepBackground: true,
      defaultLang: 'text',
    })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(clean);

  return result.toString();
}

// Extraer tabla de contenidos del markdown
export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractToc(markdown: string): TocItem[] {
  const clean = stripFrontmatter(markdown);
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(clean)) !== null) {
    const level = match[1].length;
    // Limpiar markdown inline (negrita, cursiva, código, links) para obtener texto plano
    const rawText = match[2]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .trim();

    // Usar el mismo algoritmo que rehype-slug (github-slugger) para IDs idénticos
    toc.push({ id: githubSlug(rawText), text: rawText, level });
  }

  return toc;
}
