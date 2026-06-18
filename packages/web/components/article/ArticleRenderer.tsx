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
        prose max-w-none dark:prose-invert font-body
        prose-headings:font-mono prose-headings:font-bold
        prose-h2:text-[23px] prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-[18px] prose-h3:mt-7 prose-h3:mb-3
        prose-p:text-[16.5px] prose-p:leading-[1.72] prose-p:text-on-surface
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-strong:text-on-surface prose-strong:font-semibold
        prose-img:rounded-xl prose-img:mx-auto
        prose-blockquote:border-primary prose-blockquote:text-on-surface-variant prose-blockquote:not-italic
        prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-md prose-pre:overflow-hidden
        prose-code:before:content-none prose-code:after:content-none
        prose-li:text-on-surface
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
