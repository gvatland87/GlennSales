import { redirect } from 'next/navigation';

// Rotsiden → Møteplan
export default function Home() {
  redirect('/meetings');
}
