'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'

interface RegisterForm {
  name: string
  email: string
  password: string
}

export default function RegisterPage() {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>()

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await api.get('/auth/can-register-admin')
        if (response.data?.canRegisterAdmin) {
          setAllowed(true)
        } else {
          toast.error('Admin user already registered. Please sign in.')
          router.replace('/login')
        }
      } catch (error) {
        toast.error('Unable to check registration status. Please try again later.')
        router.replace('/login')
      } finally {
        setChecking(false)
      }
    }

    void checkAdmin()
  }, [router])

  const onSubmit = async (data: RegisterForm) => {
    setSubmitting(true)
    try {
      await api.post('/auth/register', {
        ...data,
        role: 'admin',
      })
      toast.success('Admin account created successfully. You can now sign in.')
      router.push('/login')
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Registration failed'
      toast.error(Array.isArray(message) ? message[0] : message)
    } finally {
      setSubmitting(false)
    }
  }

  if (checking || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Initial admin setup</CardTitle>
          <CardDescription className="text-center">
            Create the first and only admin account for this dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Admin User"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Choose a strong password"
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Creating admin...' : 'Create admin account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
