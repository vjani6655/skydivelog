import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Jump Logs, the skydiving logbook app.",
  alternates: { canonical: "https://jumplogs.com/terms" },
}

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of terms",
    content: `By creating an account, downloading the Jump Logs app, or using the Jump Logs website (jumplogs.com), you agree to be bound by these Terms of Service. If you do not agree, do not use the service. These terms apply to all users of the mobile app and website.`,
  },
  {
    id: "eligibility",
    title: "Eligibility",
    content: `You must be at least 16 years old to use Jump Logs. By using the service, you confirm that you meet this requirement. If you are under 18, you should review these terms with a parent or guardian.`,
  },
  {
    id: "risk",
    title: "Use at your own risk",
    content: `YOU USE JUMP LOGS ENTIRELY AT YOUR OWN RISK. Jump Logs is a personal logbook tool designed to help you record and organise your skydiving activity. It is not an official record-keeping system and is not affiliated with any national or international skydiving authority (including APF, USPA, BPA, CSPA, or similar bodies).

Jump Logs does not replace your official logbook, instructor sign-off records, or any documentation required by your governing body. You are solely responsible for maintaining your own accurate, official records and for complying with all requirements of your national skydiving authority, dropzone operators, and applicable laws.

Skydiving is an inherently dangerous activity. Nothing in Jump Logs — including jump counts, currency displays, equipment records, or any alert or notification — constitutes safety advice, operational guidance, or a substitute for proper training and adherence to your governing body's rules. Never rely on Jump Logs to determine whether you are current, qualified, or safe to jump.`,
  },
  {
    id: "accuracy",
    title: "Accuracy of data",
    content: `Jump Logs provides tools for you to log and display your data. All calculations — including currency windows, jump counts, freefall time, equipment service intervals, and certification expiry dates — are computed from the data you enter. We make no warranty that these calculations are accurate, complete, or current.

You are responsible for ensuring the accuracy of all data you enter. We are not liable for any errors, omissions, or inaccuracies in your records or in any calculations derived from them. Do not use Jump Logs as the sole basis for safety decisions.`,
  },
  {
    id: "data-loss",
    title: "Data loss",
    content: `We take reasonable precautions to protect your data, including regular database backups and secure hosting infrastructure. However, we do not guarantee that your data will never be lost, corrupted, or inaccessible.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OWNER AND DEVELOPER OF JUMP LOGS IS NOT RESPONSIBLE FOR ANY LOSS OF DATA, HOWEVER CAUSED. We strongly recommend that you regularly export your logbook data (PDF or CSV) as an independent backup. The export function is available from your logbook page at all times.`,
  },
  {
    id: "account",
    title: "Your account",
    content: `You are responsible for keeping your login credentials secure and for all activity that occurs under your account. You must notify us immediately at support@jumplogs.com if you become aware of any unauthorised access. We are not liable for losses resulting from compromised credentials.

You may not share your account with others or create accounts on behalf of third parties without their consent.`,
  },
  {
    id: "subscription",
    title: "Subscription & payments",
    content: `Jump Logs Pro is an annual subscription billed in USD. Your subscription renews automatically at the end of each billing period. You can cancel at any time from your account settings — access continues until the end of the paid period.

Payments are processed by Stripe. We do not store your payment card details. Pricing may change with reasonable notice.

No refunds are issued for change of mind. Australian Consumer Law does not require refunds for change of mind on digital services.

Where a remedy is available under the Australian Consumer Law because the service fails to meet a consumer guarantee, any refund or remedy will be proportional to the period of the subscription that has not yet been used. If you have used the service for 30 days or more of a 12-month subscription period, you have received substantial benefit from the service and no refund of the used portion will be provided. Any remedy will apply only to the remaining unused subscription period.`,
  },
  {
    id: "conduct",
    title: "Acceptable use",
    content: `You may not use Jump Logs to:
• Violate any applicable law or regulation
• Submit false, fraudulent, or misleading information
• Attempt to reverse-engineer, scrape, or disrupt the service
• Probe or test the security of the service
• Upload content that infringes third-party intellectual property rights
• Harass, impersonate, or harm others

We reserve the right to suspend or terminate accounts that violate these terms without notice.`,
  },
  {
    id: "ip",
    title: "Intellectual property",
    content: `All content, design, code, and trademarks associated with Jump Logs are owned by the developer and are protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission.

Your jump data and logbook entries remain your property. By using the service, you grant us a limited licence to store, process, and display your data solely to provide the service to you.`,
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    content: `JUMP LOGS IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT.

WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THAT ANY DEFECTS WILL BE CORRECTED.

THE DEVELOPER IS AN INDIVIDUAL AND A QUALIFIED SKYDIVER, NOT A LICENSED AVIATION AUTHORITY, SAFETY INSPECTOR, OR EQUIPMENT TECHNICIAN. NOTHING IN THIS APP SHOULD BE TREATED AS PROFESSIONAL OR AUTHORITATIVE ADVICE ON ANY MATTER RELATING TO SKYDIVING SAFETY OR EQUIPMENT.

AUSTRALIAN CONSUMER LAW: NOTHING IN THESE TERMS EXCLUDES, RESTRICTS OR MODIFIES ANY RIGHT, REMEDY, GUARANTEE, WARRANTY OR OTHER TERM OR CONDITION IMPLIED OR IMPOSED BY THE AUSTRALIAN CONSUMER LAW (SCHEDULE 2 TO THE COMPETITION AND CONSUMER ACT 2010 (CTH)) WHICH CANNOT LAWFULLY BE EXCLUDED OR LIMITED. TO THE EXTENT PERMITTED BY THAT LEGISLATION, OUR LIABILITY FOR ANY FAILURE TO COMPLY WITH A CONSUMER GUARANTEE IS LIMITED (AT OUR OPTION) TO RE-SUPPLYING THE SERVICE OR PAYING THE COST OF HAVING THE SERVICE SUPPLIED AGAIN.`,
  },
  {
    id: "liability",
    title: "Limitation of liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OWNER, DEVELOPER, AND OPERATORS OF JUMP LOGS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:

• Loss of data or logbook records
• Errors or inaccuracies in currency, equipment, or certification calculations
• Decisions made in reliance on information displayed in the app
• Service interruption or unavailability
• Any harm or injury arising from skydiving activities

IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $12 USD IF NO AMOUNT WAS PAID.

NOTHING IN THESE TERMS EXCLUDES OR LIMITS OUR LIABILITY WHERE IT WOULD BE UNLAWFUL TO DO SO, INCLUDING UNDER THE AUSTRALIAN CONSUMER LAW. WHERE THE AUSTRALIAN CONSUMER LAW APPLIES AND CANNOT BE EXCLUDED, THESE LIMITATIONS APPLY ONLY TO THE EXTENT PERMITTED BY THAT LEGISLATION.`,
  },
  {
    id: "indemnity",
    title: "Indemnification",
    content: `You agree to indemnify and hold harmless the developer and operators of Jump Logs from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of your use of the service, your violation of these terms, or your violation of any third-party rights.`,
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: `We may update these Terms of Service from time to time. We will notify you of material changes by updating the "Last updated" date and, where appropriate, by sending a notice to your registered email. Continued use of the service after changes take effect constitutes acceptance of the revised terms.`,
  },
  {
    id: "termination",
    title: "Termination",
    content: `We reserve the right to suspend or terminate your access to Jump Logs immediately for breach of these terms, or otherwise with reasonable prior notice. You may delete your account at any time from your account settings. Upon termination, your right to use the service ceases, though you may export your data at any point before deletion.`,
  },
  {
    id: "law",
    title: "Governing law & disputes",
    content: `These terms are governed by the laws of the State of Victoria, Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Victoria, Australia. If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.`,
  },
  {
    id: "contact-legal",
    title: "Contact",
    content: `For questions about these terms, contact us at support@jumplogs.com.`,
  },
]

export default function TermsPage() {
  return (
    <>
      <section
        className="pt-16 pb-10 px-5 border-b border-border"
        style={{ background: "radial-gradient(ellipse at 50% -10%, #132A50 0%, #0A1220 60%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-4 mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-fg tracking-tight">Terms of service</h1>
          <p className="text-sm text-fg-4 mt-2">Last updated: May 2026 &nbsp;·&nbsp; <Link href="/privacy" className="hover:text-fg transition-colors">Privacy Policy</Link></p>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          {/* Warning banner */}
          <div className="mb-10 p-4 bg-warn/10 border border-warn/30 rounded-lg">
            <p className="text-xs font-semibold text-warn uppercase tracking-wider mb-1">Important</p>
            <p className="text-sm text-fg-3 leading-relaxed">
              Jump Logs is a logbook tool, not a safety system. Never use it to determine whether you are current, qualified, or safe to jump.
              You use this app entirely at your own risk. The developer is not responsible for data loss, calculation errors, or decisions made based on information displayed in the app.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <nav className="hidden md:block space-y-1.5 sticky top-20 self-start">
              {sections.map(({ id, title }) => (
                <a key={id} href={`#${id}`} className="block text-xs text-fg-4 hover:text-fg transition-colors py-0.5">
                  {title}
                </a>
              ))}
            </nav>

            <div className="md:col-span-3 space-y-10">
              {sections.map(({ id, title, content }) => (
                <div key={id} id={id}>
                  <h2 className="text-base font-semibold text-fg mb-2">{title}</h2>
                  <p className="text-sm text-fg-3 leading-relaxed whitespace-pre-line">{content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
