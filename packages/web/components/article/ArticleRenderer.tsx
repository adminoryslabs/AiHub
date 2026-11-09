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
        article-prose prose max-w-none font-orys-sans
        prose-headings:font-orys-sans prose-headings:font-semibold prose-headings:tracking-[-0.02em]
        prose-h1:hidden
        prose-h2:text-[27px] prose-h2:mt-10 prose-h2:mb-4 prose-h2:leading-[1.2]
        prose-h3:text-[21px] prose-h3:mt-7 prose-h3:mb-3
        prose-h4:text-[18px]
        prose-p:text-[17.5px] prose-p:leading-[1.78] prose-p:text-orys-fg
        prose-a:text-orys-accent prose-a:no-underline hover:prose-a:underline prose-a:font-medium
        prose-strong:text-orys-fg prose-strong:font-semibold
        prose-img:rounded-orys-md prose-img:mx-auto prose-img:my-8
        prose-blockquote:border-orys-accent prose-blockquote:border-l-[3px]
        prose-blockquote:text-orys-fg prose-blockquote:not-italic
        prose-blockquote:font-orys-sans prose-blockquote:font-medium
        prose-blockquote:text-[22px] prose-blockquote:leading-[1.35]
        prose-blockquote:tracking-[-0.01em] prose-blockquote:py-1
        prose-blockquote:pl-5
        prose-blockquote:my-7
        prose-pre:p-0 prose-pre:bg-transparent prose-pre:rounded-none prose-pre:overflow-hidden
        prose-code:before:content-none prose-code:after:content-none
        prose-li:text-orys-fg prose-li:my-1
        prose-ul:my-5 prose-ol:my-5
        ${className}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
