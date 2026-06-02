//app/leads/create/page.tsx
'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash } from 'lucide-react';

type FieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DROPDOWN';

interface DynamicField {
  id: string;
  key: string;
  type: FieldType;
  value: any;
  options?: string[];
}

export default function CreateLeadPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fields, setFields] = useState<DynamicField[]>([]);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        key: '',
        type: 'TEXT',
        value: '',
      },
    ]);
  };

  const updateField = (id: string, updated: Partial<DynamicField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updated } : f)));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  // const handleSubmit = async () => {
  //   const dynamicData: Record<string, any> = {};

  //   fields.forEach(field => {
  //     if (field.key) {
  //       dynamicData[field.key] = field.value;
  //     }
  //   });

  //   await apiFetch('/leads', {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       name,
  //       phone,
  //       data: dynamicData,
  //     }),
  //   });

  //   alert('Lead created!');
  //   setName('');
  //   setPhone('');
  //   setFields([]);
  // };

  const handleSubmit = async () => {
    try {
      const dynamicData: Record<string, any> = {};

      fields.forEach((field) => {
        if (field.key) {
          dynamicData[field.key] = field.value;
        }
      });

      await apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone,
          data: dynamicData,
        }),
      });

      alert('Lead created!');
    } catch (error: any) {
      console.log('FULL ERROR:', error);
      console.log('BACKEND RESPONSE:', error.response?.data);
      alert(JSON.stringify(error.response?.data));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Lead</h1>

      <Input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id} className="border p-4 rounded space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Field Key"
                value={field.key}
                onChange={(e) => updateField(field.id, { key: e.target.value })}
              />

              <select
                className="border rounded px-2"
                value={field.type}
                onChange={(e) =>
                  updateField(field.id, {
                    type: e.target.value as FieldType,
                    value: '',
                  })
                }
              >
                <option value="TEXT">TEXT</option>
                <option value="NUMBER">NUMBER</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="DATE">DATE</option>
                <option value="DROPDOWN">DROPDOWN</option>
              </select>

              <Button
                variant="destructive"
                onClick={() => removeField(field.id)}
              >
                <Trash size={16} />
              </Button>
            </div>

            {/* Render Value Input */}
            {field.type === 'TEXT' && (
              <Input
                placeholder="Value"
                value={field.value}
                onChange={(e) =>
                  updateField(field.id, { value: e.target.value })
                }
              />
            )}

            {field.type === 'NUMBER' && (
              <Input
                type="number"
                placeholder="Value"
                value={field.value}
                onChange={(e) =>
                  updateField(field.id, {
                    value: Number(e.target.value),
                  })
                }
              />
            )}

            {field.type === 'BOOLEAN' && (
              <select
                className="border rounded px-2"
                value={String(field.value)}
                onChange={(e) =>
                  updateField(field.id, {
                    value: e.target.value === 'true',
                  })
                }
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            )}

            {field.type === 'DATE' && (
              <Input
                type="date"
                value={field.value}
                onChange={(e) =>
                  updateField(field.id, { value: e.target.value })
                }
              />
            )}

            {field.type === 'DROPDOWN' && (
              <Input
                placeholder="Comma separated options"
                onBlur={(e) =>
                  updateField(field.id, {
                    options: e.target.value.split(','),
                  })
                }
              />
            )}
          </div>
        ))}

        <Button variant="outline" onClick={addField}>
          <Plus size={16} className="mr-2" />
          Add Field
        </Button>
      </div>

      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
