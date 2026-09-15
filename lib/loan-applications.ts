export interface LoanApplication {
  id: string
  // Simplified PM Loan Scheme form
  fullName: string
  fatherOrHusbandName?: string
  cnicNumber?: string
  monthlyIncome?: string
  residentialAddress?: string
  propertyType?: string
  requiredLoanAmount?: string
  profession?: string
  // Legacy long-form fields (older submissions only)
  applicantType?: string
  cnicStatus?: string
  maritalStatus?: string
  gender?: string
  employmentStatus?: string
  monthlyIncomeRange?: string
  purposeOfFinancing?: string
  propertyStatus?: string
  propertyOwnership?: string
  propertySize?: string
  requiredLoanAmountCustom?: string
  preferredLoanTenure?: string
  currentHomeOwnership?: string
  preferredBank?: string
  city?: string
  dateOfBirth?: string
  mobileNumber?: string
  email?: string
  currentAddress?: string
  permanentAddress?: string
  province?: string
  monthlyGrossIncome?: string
  monthlyNetIncome?: string
  existingMonthlyLoanInstallments?: string
  monthlyRent?: string
  otherIncome?: string
  employmentOrBusinessName?: string
  yearsInEmploymentOrBusiness?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export const LOAN_STATUS_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Closed', value: 'closed' },
] as const

export function loanStatusClass(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-red-100 text-red-800'
    case 'reviewed':
      return 'bg-blue-100 text-blue-800'
    case 'contacted':
      return 'bg-yellow-100 text-yellow-800'
    case 'closed':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function loanAmountLabel(row: Pick<LoanApplication, 'requiredLoanAmount' | 'requiredLoanAmountCustom'>): string {
  const custom = row.requiredLoanAmountCustom?.trim()
  if (custom) return custom
  return row.requiredLoanAmount?.trim() || '—'
}

/** Income from the simplified form, falling back to legacy long-form fields. */
export function loanIncomeLabel(row: LoanApplication): string {
  return (
    row.monthlyIncome?.trim() ||
    row.monthlyNetIncome?.trim() ||
    row.monthlyGrossIncome?.trim() ||
    row.monthlyIncomeRange?.trim() ||
    '—'
  )
}

export function displayValue(value?: string | null): string {
  const trimmed = value?.trim()
  return trimmed || '—'
}

export type DetailField = { label: string; value?: string | null }

export type DetailSection = { title: string; fields: DetailField[] }

export function loanApplicationSections(app: LoanApplication): DetailSection[] {
  const sections: DetailSection[] = [
    {
      title: 'Application',
      fields: [
        { label: 'Full name', value: app.fullName },
        { label: 'Father / husband name', value: app.fatherOrHusbandName },
        { label: 'CNIC number', value: app.cnicNumber },
        { label: 'Monthly income', value: app.monthlyIncome },
        { label: 'Residential address', value: app.residentialAddress || app.currentAddress },
        { label: 'Property type interest', value: app.propertyType },
        { label: 'Required loan amount', value: loanAmountLabel(app) },
        { label: 'Profession', value: app.profession || app.employmentStatus },
      ],
    },
    {
      title: 'Additional details (earlier form)',
      fields: [
        { label: 'Mobile number', value: app.mobileNumber },
        { label: 'Email', value: app.email },
        { label: 'Applicant type', value: app.applicantType },
        { label: 'CNIC status', value: app.cnicStatus },
        { label: 'Marital status', value: app.maritalStatus },
        { label: 'Gender', value: app.gender },
        { label: 'Date of birth', value: app.dateOfBirth },
        { label: 'Monthly income range', value: app.monthlyIncomeRange },
        { label: 'Purpose of financing', value: app.purposeOfFinancing },
        { label: 'Property status', value: app.propertyStatus },
        { label: 'Property ownership', value: app.propertyOwnership },
        { label: 'Property size', value: app.propertySize },
        { label: 'Preferred loan tenure', value: app.preferredLoanTenure },
        { label: 'Current home ownership', value: app.currentHomeOwnership },
        { label: 'Preferred bank', value: app.preferredBank },
        { label: 'City', value: app.city },
        { label: 'Permanent address', value: app.permanentAddress },
        { label: 'Province', value: app.province },
        { label: 'Monthly gross income', value: app.monthlyGrossIncome },
        { label: 'Monthly net income', value: app.monthlyNetIncome },
        { label: 'Existing monthly loan installments', value: app.existingMonthlyLoanInstallments },
        { label: 'Monthly rent', value: app.monthlyRent },
        { label: 'Other income', value: app.otherIncome },
        { label: 'Employment / business name', value: app.employmentOrBusinessName },
        { label: 'Years in employment / business', value: app.yearsInEmploymentOrBusiness },
      ].filter((f) => f.value?.trim()),
    },
  ]
  return sections.filter((s) => s.fields.length > 0)
}
