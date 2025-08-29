
// "use client";

// import { useState, FormEvent, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { useToast } from "@/hooks/use-toast";
// import Image from 'next/image';
// import { Network } from 'lucide-react';

// const ADMIN_EMAIL = "minati@admin";
// const ADMIN_PASSWORD = "minati@123";

// export default function LoginPage() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const router = useRouter();
//   const { toast } = useToast();

//   useEffect(() => {
//     const isAuthenticated = sessionStorage.getItem('isAuthenticated');
//     if (isAuthenticated === 'true') {
//       router.push('/');
//     }
//   }, [router]);

//   const handleLogin = (e: FormEvent) => {
//     e.preventDefault();
//     if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
//       sessionStorage.setItem('isAuthenticated', 'true');
//       toast({
//         title: "Login Successful",
//         description: "Welcome back!",
//       });
//       router.push('/');
//     } else {
//       toast({
//         variant: "destructive",
//         title: "Login Failed",
//         description: "Invalid email or password.",
//       });
//     }
//   };

//   return (
//     <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 animate-fadeIn">
//       <div className="flex items-center justify-center py-12">
//         <div className="mx-auto grid w-[350px] gap-6">
//             <div className="grid gap-2 text-center animate-slideUp">
//                 <div className="mx-auto bg-primary/10 text-primary rounded-lg p-3 w-fit mb-2">
//                     <Network className="h-8 w-8" />
//                 </div>
//                 <h1 className="text-3xl font-bold">MinatiVault</h1>
//                 <p className="text-balance text-muted-foreground">
//                     Enter your credentials to access the dashboard
//                 </p>
//             </div>
//             <form onSubmit={handleLogin} className="grid gap-4 animate-slideUp" style={{animationDelay: '0.2s'}}>
//                 <div className="grid gap-2">
//                     <Label htmlFor="email">Email</Label>
//                     <Input
//                         id="email"
//                         type="email"
//                         placeholder="m@example.com"
//                         required
//                         value={email}
//                         onChange={(e) => setEmail(e.target.value)}
//                     />
//                 </div>
//                 <div className="grid gap-2">
//                     <Label htmlFor="password">Password</Label>
//                     <Input 
//                         id="password" 
//                         type="password" 
//                         required 
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                     />
//                 </div>
//                 <Button type="submit" className="w-full transition-transform transform hover:scale-105">
//                     Login
//                 </Button>
//             </form>
//         </div>
//       </div>
//       <div className="hidden bg-muted lg:flex items-center justify-center p-8 animate-fadeIn">
//          <Image
//           src="/black_minati.png"
//           alt="Image"
//           width="1000"
//           height="1000"
//           className="object-contain transform transition-transform duration-500 hover:scale-105"
//           data-ai-hint="logo"
//         />
//       </div>
//     </div>
//   );
// }
"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Network, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

const ADMIN_EMAIL = "admin@minati.io";
const ADMIN_PASSWORD = "minati@123";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated === 'true') {
      router.push('/');
    }
  }, [router]);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    // Simulate API call delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('isAuthenticated', 'true');
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to dashboard...",
      });
      
      // Small delay before redirect for better UX
      setTimeout(() => {
        router.push('/');
      }, 500);
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed", 
        description: "Invalid email or password. Please try again.",
      });
    }
    
    setIsLoading(false);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* Left Panel - Login Form */}
      <div className="flex items-center justify-center py-12 px-4 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mx-auto w-full max-w-[400px] space-y-8">
          {/* Header */}
          <div className="space-y-4 text-center animate-slideUp">
            <div className="mx-auto bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-2xl p-4 w-fit shadow-lg ring-1 ring-primary/10">
              <Network className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                MinatiVault
              </h1>
              <p className="text-muted-foreground text-lg">
                Enter your credentials to access the dashboard
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 animate-slideUp" style={{animationDelay: '0.2s'}}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={handleEmailChange}
                      className={`pl-4 h-12 text-base transition-all duration-200 ${
                        emailError 
                          ? 'border-destructive focus:ring-destructive/20' 
                          : 'focus:ring-primary/20 focus:border-primary'
                      }`}
                      disabled={isLoading}
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? "email-error" : undefined}
                    />
                  </div>
                  {emailError && (
                    <p id="email-error" className="text-sm text-destructive animate-fadeIn" role="alert">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={handlePasswordChange}
                      className={`pl-4 pr-12 h-12 text-base transition-all duration-200 ${
                        passwordError 
                          ? 'border-destructive focus:ring-destructive/20' 
                          : 'focus:ring-primary/20 focus:border-primary'
                      }`}
                      disabled={isLoading}
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? "password-error" : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordError && (
                    <p id="password-error" className="text-sm text-destructive animate-fadeIn" role="alert">
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:transform-none"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground animate-fadeIn" style={{animationDelay: '0.4s'}}>
            Secure access to your MinatiVault dashboard
          </p>
        </div>
      </div>

      {/* Right Panel - Enhanced Content */}
      <div className="hidden bg-gradient-to-br from-muted/30 via-muted/50 to-muted/70 lg:flex flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5" />
        
        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-2xl space-y-8 text-center">
          {/* Logo Section - Smaller */}
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Image
                src="/black_minati.png"
                alt="MinatiVault Logo"
                width="120"
                height="120"
                className="object-contain transform transition-all duration-300 hover:scale-105"
                priority
              />
            </div>
            
            {/* Brand Message */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground/90">
                Welcome to MinatiVault
              </h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                Your comprehensive telecommunications management platform
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground/80">
              What you can do with MinatiVault
            </h3>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-4 p-3 bg-background/20 backdrop-blur-sm rounded-lg border border-border/30">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Network className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground/90">Network Monitoring</h4>
                  <p className="text-sm text-muted-foreground">Real-time network performance tracking</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-background/20 backdrop-blur-sm rounded-lg border border-border/30">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground/90">Analytics Dashboard</h4>
                  <p className="text-sm text-muted-foreground">Comprehensive data insights and reports</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-background/20 backdrop-blur-sm rounded-lg border border-border/30">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground/90">Secure Management</h4>
                  <p className="text-sm text-muted-foreground">Enterprise-grade security and control</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 right-1/6 w-16 h-16 bg-primary/8 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}} />
        
        {/* Floating Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
      </div>
    </div>
  );
}
