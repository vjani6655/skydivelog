/**
 * Legal disclaimer rendered at the bottom of every blog post.
 * Mirrors the risk/accuracy language in the Terms of Service.
 */
export default function BlogDisclaimer() {
  return (
    <aside className="mt-10 border border-border rounded-lg p-5 bg-surface">
      <p className="text-xs text-fg-3 leading-relaxed">
        <strong className="text-fg-2">Disclaimer.</strong>{" "}
        Jump Logs is a personal record-keeping tool only. Nothing in this article — or anywhere in the app — constitutes safety advice, operational guidance, or a substitute for proper training. Jump Logs is not affiliated with any national or international skydiving authority (including APF, USPA, BPA, CSPA, or similar bodies) and does not replace your official logbook or any documentation required by your governing body.
      </p>
      <p className="text-xs text-fg-3 leading-relaxed mt-2">
        Skydiving is an inherently dangerous activity. Never rely on Jump Logs — including any jump counts, currency displays, equipment records, alerts, or notifications — to determine whether you are current, qualified, or safe to jump. Always follow the rules of your governing body and the instructions of qualified instructors and riggers.
      </p>
      <p className="text-xs text-fg-3 leading-relaxed mt-2">
        The information in this article is provided for general guidance only. Governing body rules and equipment manufacturer requirements vary and change over time. Always verify current requirements directly with your governing body or equipment manufacturer.
      </p>
    </aside>
  )
}
