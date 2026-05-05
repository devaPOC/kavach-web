import React, { useState } from 'react';
import { Currency, CurrencyInput } from '@/components/ui/Currency';
import { useCurrency } from '@/lib/hooks/useCurrency';

/**
 * Example component showing how to use currency formatting
 * This is for demonstration purposes and can be removed in production
 */
export function CurrencyExample() {
  const [amount, setAmount] = useState('');
  const { format, validate } = useCurrency();

  const examples = [
    { value: 100, label: 'Basic amount' },
    { value: 1250.500, label: 'With decimals' },
    { value: 0.250, label: 'Small amount' },
    { value: 10000, label: 'Large amount' }
  ];

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">OMR Currency Examples</h2>
      
      {/* Display Examples */}
      <div className="space-y-2 mb-6">
        <h3 className="font-medium">Display Examples:</h3>
        {examples.map((example, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-600">{example.label}:</span>
            <Currency amount={example.value} variant="default" />
          </div>
        ))}
      </div>

      {/* Input Example */}
      <div className="space-y-2">
        <h3 className="font-medium">Input Example:</h3>
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          placeholder="Enter amount"
        />
        {amount && (
          <div className="text-sm text-gray-600">
            Formatted: <Currency amount={amount} />
            {!validate(amount) && (
              <span className="text-red-500 ml-2">(Invalid amount)</span>
            )}
          </div>
        )}
      </div>

      {/* Different Variants */}
      <div className="space-y-2 mt-6">
        <h3 className="font-medium">Display Variants:</h3>
        <div className="space-y-1">
          <div>Small: <Currency amount={1250.500} variant="small" /></div>
          <div>Default: <Currency amount={1250.500} variant="default" /></div>
          <div>Large: <Currency amount={1250.500} variant="large" /></div>
        </div>
      </div>
    </div>
  );
}