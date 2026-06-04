import React from 'react'

export default function PageHeader({
  title,
  description,
  tag,
}: {
  title: string
  description?: string
  tag?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {tag ? (
          <span className="inline-flex rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1f54e0]">
            {tag}
          </span>
        ) : null}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{description}</p> : null}
      </div>
    </div>
  )
}
