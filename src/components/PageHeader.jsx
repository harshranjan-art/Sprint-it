export default function PageHeader({ title, tagline }) {
  return (
    <div className="mb-8 border-b-2 border-black pb-6">
      <h1 className="text-3xl max-md:text-2xl font-black tracking-tight text-black uppercase">{title}</h1>
      <p className="text-base text-text-secondary mt-1 italic">&ldquo;{tagline}&rdquo;</p>
    </div>
  )
}
