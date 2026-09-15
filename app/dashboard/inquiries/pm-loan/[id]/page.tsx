import { redirect } from 'next/navigation'

export default function LegacyPmLoanInquiryRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/loan-applications/${params.id}`)
}
