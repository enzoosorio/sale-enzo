'use client';

import { PrimaryButton } from "@/components/reusable/CTA/buttons/Button";
import { logoutUser } from "@/actions/login";


export const LogoutButton = () => {
  return (
    <PrimaryButton onClick={async () => {
        await logoutUser();
    }}>
        Cerrar sesión
    </PrimaryButton>
  )
}
