
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  LogOut,
  User as UserIcon,
  Building2,
  Settings,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from './ui/dropdown-menu';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/customers', icon: Building2, label: 'Харилцагчид' },
];

const adminNavItems = [
  ...navItems,
  { href: '/users', icon: Users, label: 'Системийн хэрэглэгчид' },
  { href: '/settings', icon: Settings, label: 'Тохиргоо' },
];

function Nav() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { user } = useAuth();
  const userRole = user?.role || 'manager';

  let items = userRole === 'admin' ? adminNavItems : navItems;
  
  // A temporary fix to show settings for all roles for development
  if (process.env.NODE_ENV === 'development' && userRole !== 'admin') {
      const settingsItem = adminNavItems.find(item => item.href === '/settings');
      if(settingsItem) items.push(settingsItem);
  }


  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href)}
              tooltip={
                state === 'collapsed'
                  ? { children: item.label, side: 'right' }
                  : undefined
              }
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function UserProfile() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  if (loading) {
    return (
       <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>?</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Loading...</span>
            <span className="text-xs text-muted-foreground">
              Please wait...
            </span>
          </div>
        </div>
    )
  }

  if (!user) {
     return null;
  }
  
  const fallbackText = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 rounded-lg bg-background/50 p-2 transition-colors hover:bg-muted">
          <Avatar className="h-8 w-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="User Avatar" />}
            <AvatarFallback>{fallbackText}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left">
            <span className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>Миний бүртгэл</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Профайл</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Гарах</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 714 735"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                xmlSpace="preserve"
                style={{
                  fillRule: 'evenodd',
                  clipRule: 'evenodd',
                  strokeLinejoin: 'round',
                  strokeMiterlimit: 2,
                }}
              >
                <g transform="matrix(1,0,0,1,-7830.54,-17449.4)">
                  <g transform="matrix(1.2013e-16,1.96187,-1.96187,1.2013e-16,13141.4,-15700.3)">
                    <path
                      d="M17271.2,2506.18L17066.3,2506.18L17066.3,2707.06C17053.3,2705.87 17040.7,2703.4 17028.6,2699.78L17028.6,2468.5L17263,2468.5C17267.1,2480.56 17269.9,2493.17 17271.2,2506.18ZM17245.2,2430.82L17179.4,2430.82L17179.4,2367.56C17206.4,2383 17229,2404.79 17245.2,2430.82ZM17245.4,2619.23C17229.2,2645.36 17206.4,2667.24 17179.4,2682.72L17179.4,2619.23L17245.4,2619.23ZM17263.1,2581.55L17141.7,2581.55L17141.7,2699.14C17129.6,2702.91 17117,2705.53 17104,2706.86L17104,2543.87L17271.3,2543.87C17269.9,2556.88 17267.1,2569.49 17263.1,2581.55ZM16991,2683.89C16963,2668.35 16939.5,2646.02 16922.8,2619.23L16991,2619.23L16991,2683.89ZM16905.1,2581.55C16901.1,2569.49 16898.3,2556.88 16897,2543.87L16991,2543.87L16991,2581.55L16905.1,2581.55ZM16897,2506.18C16898.4,2493.17 16901.2,2480.56 16905.2,2468.5L16991,2468.5L16991,2506.18L16897,2506.18ZM16923,2430.82C16939.6,2404.13 16963,2381.89 16991,2366.39L16991,2430.82L16923,2430.82ZM17028.6,2350.5C17040.7,2346.88 17053.3,2344.41 17066.3,2343.22L17066.3,2430.82L17028.6,2430.82L17028.6,2350.5ZM17104,2343.42C17117,2344.75 17129.6,2347.37 17141.7,2351.14L17141.7,2430.82L17104,2430.82L17104,2343.42Z"
                      style={{ fill: 'rgb(242,99,33)' }}
                    />
                  </g>
                </g>
              </svg>
            </Button>
            <span className="font-headline text-lg font-semibold">Tumen Tech</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <Nav />
        </SidebarContent>
        <SidebarFooter>
          <div className="flex flex-col gap-2">
            <UserProfile />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
