// Renderizador de markdown a HTML (server component)
// El HTML ya viene procesado desde lib/markdown.ts

interface ArticleRendererProps {
  html: string;
  className?: string;
}

export function ArticleRenderer({ html, className = '' }: ArticleRendererProps) {
  return (
    <div
      className={`
        prose prose-lg max-w-none dark:prose-invert
        prose-headings:font-headline
        prose-h1:text-5xl prose-h1:font-bold prose-h1:leading-tight
        prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-4
        prose-h3:text-xl prose-h3:font-bold
        prose-p:text-on-surface prose-p:leading-relaxed
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-img:rounded-xl prose-img:mx-auto
        prose-blockquote:border-primary prose-blockquote:text-on-surface-variant
        prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-xl prose-pre:overflow-hidden
        prose-code:before:content-none prose-code:after:content-none
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
