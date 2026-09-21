import { useGetCredits } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Zap, Shield } from 'lucide-react';

const plans = [
  {
    name: 'Creator',
    price: '$15',
    period: '/mo',
    description: 'Perfect for enthusiasts and short-form creators.',
    credits: 1000,
    features: [
      'Standard resolution (720p)',
      'Up to 4s duration',
      '2 active characters',
      'Standard priority queue'
    ]
  },
  {
    name: 'Pro Studio',
    price: '$49',
    period: '/mo',
    description: 'For professionals who need quality and speed.',
    credits: 5000,
    features: [
      'High resolution (1080p)',
      'Up to 8s duration',
      '10 active characters',
      'High priority queue',
      'Prompt enhancement included'
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/mo',
    description: 'Uncapped potential for agencies and teams.',
    credits: 20000,
    features: [
      'Highest resolution output',
      'Unlimited duration stitching',
      'Unlimited characters',
      'Dedicated GPU rendering',
      'API access'
    ]
  }
];

export function Pricing() {
  const { data: creditsData } = useGetCredits();

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-16">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-display font-bold tracking-tight">Simple, flexible pricing</h1>
        <p className="text-lg text-muted-foreground">
          Turn your ideas into cinematic realities. Choose the plan that fits your creative volume.
        </p>
      </div>

      <div className="mx-auto max-w-lg mb-12">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Current Balance</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-display font-bold">{creditsData?.credits ?? '-'}</span>
                <span className="text-sm text-muted-foreground mb-1">credits</span>
              </div>
              <p className="text-xs text-primary font-medium mt-1">
                Current plan: {creditsData?.plan ?? 'Free'}
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg scale-105 z-10' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 inset-x-0 flex justify-center">
                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-3">
                <Zap className="h-5 w-5 text-accent" />
                <div>
                  <div className="font-bold text-sm">{plan.credits}</div>
                  <div className="text-xs text-muted-foreground">Credits per month</div>
                </div>
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={plan.popular ? 'default' : 'outline'}
              >
                {plan.name === (creditsData?.plan || 'Free') ? 'Current Plan' : 'Subscribe'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="text-center mt-12">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full">
          <Shield size={16} />
          Secure payments powered by Stripe. Cancel anytime.
        </div>
      </div>
    </div>
  );
}
