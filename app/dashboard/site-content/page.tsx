'use client'

import { useState } from 'react'
import { useQuery } from 'react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

type PageKeyDef = { key: string; label: string; hasBody: boolean }

const PAGE_KEYS: PageKeyDef[] = [
  { key: 'home', label: 'Home', hasBody: false },
  { key: 'about', label: 'About Us', hasBody: false },
  { key: 'what-we-do', label: 'What We Do', hasBody: true },
  { key: 'projects', label: 'Projects', hasBody: false },
  { key: 'gallery', label: 'Gallery', hasBody: false },
  { key: 'careers', label: 'Careers', hasBody: false },
  { key: 'team', label: 'Team', hasBody: false },
  { key: 'contact', label: 'Contact', hasBody: false },
  { key: 'privacy', label: 'Privacy Policy', hasBody: true },
  { key: 'terms', label: 'Terms & Conditions', hasBody: true },
]

type SiteContentDoc = {
  pageKey: string
  label?: string
  metaTitle?: string
  metaDescription?: string
  body?: string
}

type FormState = {
  label: string
  metaTitle: string
  metaDescription: string
  body: string
}

const emptyForm: FormState = { label: '', metaTitle: '', metaDescription: '', body: '' }

export default function SiteContentPage() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const { data, refetch } = useQuery('site-content', async () => {
    const response = await api.get('/site-content')
    return response.data as SiteContentDoc[]
  })

  const contentByKey: Record<string, SiteContentDoc> = {}
  ;(data || []).forEach((doc) => {
    contentByKey[doc.pageKey] = doc
  })

  const toggleExpand = (def: PageKeyDef) => {
    if (expandedKey === def.key) {
      setExpandedKey(null)
      return
    }
    const existing = contentByKey[def.key]
    setForm({
      label: existing?.label ?? def.label,
      metaTitle: existing?.metaTitle ?? '',
      metaDescription: existing?.metaDescription ?? '',
      body: existing?.body ?? '',
    })
    setExpandedKey(def.key)
  }

  const handleSave = async (key: string) => {
    setSaving(true)
    try {
      await api.put(`/site-content/${key}`, {
        label: form.label,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        body: form.body,
      })
      toast.success('Page content saved')
      refetch()
    } catch (error) {
      toast.error('Failed to save page content')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Site Content</h1>
        <p className="text-gray-600">
          Manage per-page SEO titles/descriptions and editable body copy for select pages.
        </p>
      </div>

      <div className="space-y-3">
        {PAGE_KEYS.map((def) => {
          const existing = contentByKey[def.key]
          const isExpanded = expandedKey === def.key
          return (
            <Card key={def.key}>
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => toggleExpand(def)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <CardTitle className="text-lg">{def.label}</CardTitle>
                      <CardDescription>
                        {existing?.metaTitle
                          ? existing.metaTitle
                          : 'No custom SEO title set — using page default'}
                      </CardDescription>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`${def.key}-metaTitle`}>SEO Title</Label>
                    <Input
                      id={`${def.key}-metaTitle`}
                      value={form.metaTitle}
                      onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                      placeholder="Leave blank to use the default page title"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${def.key}-metaDescription`}>SEO Meta Description</Label>
                    <textarea
                      id={`${def.key}-metaDescription`}
                      className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                      placeholder="Leave blank to use the default page description"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Aim for around 155 characters so it doesn&apos;t get truncated in search results.
                      Current length: {form.metaDescription.length}
                    </p>
                  </div>
                  {def.hasBody && (
                    <div>
                      <Label htmlFor={`${def.key}-body`}>Page Body</Label>
                      <textarea
                        id={`${def.key}-body`}
                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        rows={14}
                        value={form.body}
                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                        placeholder="Plain text. Use blank lines to separate paragraphs."
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setExpandedKey(null)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => handleSave(def.key)} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
