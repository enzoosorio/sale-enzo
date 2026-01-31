import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'
import { getUserById } from '@/lib/auth/getUserById'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/home'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/home'
  }

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {   

      const {data : {user}, error: userError} = await supabase.auth.getUser()
       if(userError || !user){
        console.error('Error fetching user after exchanging code:', userError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
       }

       const existingUser = await getUserById(user.id)

        // Extraer nombre y apellido del full_name si existe
        const fullName = user.user_metadata?.full_name || '';
        const first_name = fullName ? fullName.split(' ')[0] : '';
        const last_name = fullName ? fullName.split(' ').slice(1).join(' ') : '';

        // Verificar si el usuario viene de un proveedor OAuth
        const isOAuthUser = user.app_metadata?.provider && user.app_metadata.provider !== 'email';

       if(!existingUser){
        // Usuario no existe en la tabla pública, crearlo
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: user.id,
            email: user.email,
            first_name: first_name || null,
            last_name: last_name || null,
            verified_email: true, // Los usuarios OAuth ya tienen el email verificado
          },
        ])

        if(insertError){
          console.error('Error inserting new user into users table:', insertError)
          return NextResponse.redirect(`${origin}/auth/auth-code-error`)
        }
       }
       else if(existingUser && isOAuthUser && (!existingUser.first_name || !existingUser.last_name)){
        // Usuario existe pero es de OAuth y no tiene nombre/apellido completos
        // Actualizar solo si hay datos para actualizar
        if(first_name || last_name) {
          const updateData: any = {};
          if(first_name && !existingUser.first_name) updateData.first_name = first_name;
          if(last_name && !existingUser.last_name) updateData.last_name = last_name;
          
          if(Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase.from('users').update(updateData).eq('id', user.id)

            if(updateError){
              console.error('Error updating user in users table:', updateError)
              return NextResponse.redirect(`${origin}/auth/auth-code-error`)
            }
          }
        }
       }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('Error exchanging code for session:', error)
    }
  } else {
    console.log('No code found in callback URL. SearchParams:', Object.fromEntries(searchParams))
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}