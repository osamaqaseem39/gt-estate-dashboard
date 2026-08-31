'use client'

import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { X, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface WhatWeDoContent {
  missionTitle: string
  missionBody: string
  visionTitle: string
  visionBody: string
  qualitiesTitle: string
  qualitiesBody: string
  projectsTitle: string
  projectsBody: string
  services: string[]
  quote: string
  ctaHeading: string
  ctaBody: string
}

type FormValues = Omit<WhatWeDoContent, 'services'>

export default function WhatWeDoPage() {
  const { data, isLoading, refetch } = useQuery<WhatWeDoContent>('what-we-do', async () => {
    const response = await api.get('/what-we-do')
    return response.data
  })

  const [services, setServices] = useState<string[]>([])
  const [newService, setNewService] = useState('')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>()

  useEffect(() => {
    if (data) {
      reset(data)
      setServices(data.services ?? [])
    }
  }, [data, reset])

  const addService = () => {
    const value = newService.trim()
    if (!value) return
    setServices((prev) => [...prev, value])
    setNewService('')
  }

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.patch('/what-we-do', { ...values, services })
      toast.success('What We Do content updated')
      refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    }
  })

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">What We Do</h1>
        <p className="text-gray-600">Edit the text sections shown on the /what-we-do page.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mission &amp; Vision</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="missionTitle">Mission heading</Label>
              <Input id="missionTitle" className="mt-1" {...register('missionTitle', { required: true })} />
              <Label htmlFor="missionBody" className="mt-3 block">Mission text</Label>
              <Textarea id="missionBody" rows={5} className="mt-1" {...register('missionBody', { required: true })} />
            </div>
            <div>
              <Label htmlFor="visionTitle">Vision heading</Label>
              <Input id="visionTitle" className="mt-1" {...register('visionTitle', { required: true })} />
              <Label htmlFor="visionBody" className="mt-3 block">Vision text</Label>
              <Textarea id="visionBody" rows={5} className="mt-1" {...register('visionBody', { required: true })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualities &amp; Projects</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="qualitiesTitle">Qualities heading</Label>
              <Input id="qualitiesTitle" className="mt-1" {...register('qualitiesTitle', { required: true })} />
              <Label htmlFor="qualitiesBody" className="mt-3 block">Qualities text</Label>
              <Textarea id="qualitiesBody" rows={5} className="mt-1" {...register('qualitiesBody', { required: true })} />
            </div>
            <div>
              <Label htmlFor="projectsTitle">Projects heading</Label>
              <Input id="projectsTitle" className="mt-1" {...register('projectsTitle', { required: true })} />
              <Label htmlFor="projectsBody" className="mt-3 block">Projects text</Label>
              <Textarea id="projectsBody" rows={5} className="mt-1" {...register('projectsBody', { required: true })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
            <CardDescription>Short pill labels shown in the services row.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {services.map((service, index) => (
                <span
                  key={`${service}-${index}`}
                  className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700"
                >
                  {service}
                  <button type="button" onClick={() => removeService(index)} aria-label={`Remove ${service}`}>
                    <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Add a service label"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addService()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addService}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote &amp; Connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="quote">Quote</Label>
              <Textarea id="quote" rows={3} className="mt-1" {...register('quote', { required: true })} />
            </div>
            <div>
              <Label htmlFor="ctaHeading">CTA heading</Label>
              <Input id="ctaHeading" className="mt-1" {...register('ctaHeading', { required: true })} />
            </div>
            <div>
              <Label htmlFor="ctaBody">CTA text</Label>
              <Textarea id="ctaBody" rows={3} className="mt-1" {...register('ctaBody', { required: true })} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
