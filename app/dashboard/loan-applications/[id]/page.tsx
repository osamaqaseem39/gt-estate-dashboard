import { redirect } from 'next/navigation'

export default function LoanApplicationDetailRedirectPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/dashboard/inquiries/pm-loan/${params.id}`)
}
