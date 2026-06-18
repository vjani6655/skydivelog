import ReactMarkdown from 'react-markdown'
import type { ComponentPropsWithoutRef } from 'react'

type HeadingProps = ComponentPropsWithoutRef<'h1'>
type ParaProps   = ComponentPropsWithoutRef<'p'>
type ListProps   = ComponentPropsWithoutRef<'ul'>
type ItemProps   = ComponentPropsWithoutRef<'li'>
type StrongProps = ComponentPropsWithoutRef<'strong'>
type EmProps     = ComponentPropsWithoutRef<'em'>
type HrProps     = ComponentPropsWithoutRef<'hr'>

const adminComponents = {
  h1: ({ children, ...p }: HeadingProps) => <h1 {...p} className="text-base font-bold text-fg mt-4 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children, ...p }: HeadingProps) => <h2 {...p} className="text-sm font-bold text-fg mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children, ...p }: HeadingProps) => <h3 {...p} className="text-xs font-semibold text-fg-2 mt-2 mb-0.5 first:mt-0">{children}</h3>,
  p:  ({ children, ...p }: ParaProps)    => <p  {...p} className="text-sm text-fg-2 leading-relaxed mb-1 last:mb-0">{children}</p>,
  ul: ({ children, ...p }: ListProps)    => <ul {...p} className="space-y-0.5 my-1">{children}</ul>,
  ol: ({ children, ...p }: ListProps)    => <ol {...p} className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>,
  li: ({ children, ...p }: ItemProps)    => (
    <li {...p} className="flex items-start gap-1.5 text-sm text-fg-2">
      <span className="mt-1.5 w-1 h-1 rounded-full bg-fg-3 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children, ...p }: StrongProps) => <strong {...p} className="font-semibold text-fg">{children}</strong>,
  em:     ({ children, ...p }: EmProps)     => <em     {...p} className="italic text-fg-3">{children}</em>,
  hr:     (p: HrProps)                      => <hr     {...p} className="border-border my-3" />,
}

const publicComponents = {
  h1: ({ children, ...p }: HeadingProps) => <h1 {...p} className="text-xl font-bold text-fg mt-6 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children, ...p }: HeadingProps) => <h2 {...p} className="text-base font-bold text-fg mt-5 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children, ...p }: HeadingProps) => <h3 {...p} className="text-sm font-semibold text-fg-2 mt-3 mb-1 first:mt-0">{children}</h3>,
  p:  ({ children, ...p }: ParaProps)    => <p  {...p} className="text-sm text-fg-2 leading-relaxed mb-2 last:mb-0">{children}</p>,
  ul: ({ children, ...p }: ListProps)    => <ul {...p} className="space-y-1 my-1.5">{children}</ul>,
  ol: ({ children, ...p }: ListProps)    => <ol {...p} className="list-decimal pl-4 space-y-1 my-1.5">{children}</ol>,
  li: ({ children, ...p }: ItemProps)    => (
    <li {...p} className="flex items-start gap-2 text-sm text-fg-2 leading-relaxed">
      <span className="mt-2 w-1 h-1 rounded-full bg-fg-3 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children, ...p }: StrongProps) => <strong {...p} className="font-semibold text-fg">{children}</strong>,
  em:     ({ children, ...p }: EmProps)     => <em     {...p} className="italic">{children}</em>,
  hr:     (p: HrProps)                      => <hr     {...p} className="border-border my-4" />,
}

export function AdminMarkdown({ children }: { children: string }) {
  return <ReactMarkdown components={adminComponents}>{children}</ReactMarkdown>
}

export function PublicMarkdown({ children }: { children: string }) {
  return <ReactMarkdown components={publicComponents}>{children}</ReactMarkdown>
}
