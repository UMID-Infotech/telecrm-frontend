//components/forms/DynamicField.tsx
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DynamicField({
  field,
  value,
  onChange,
}: any) {
  switch (field.type) {
    case "TEXT":
      return (
        <div>
          <label>{field.label}</label>
          <Input
            value={value || ""}
            onChange={(e) =>
              onChange(e.target.value)
            }
          />
        </div>
      );

    case "NUMBER":
      return (
        <div>
          <label>{field.label}</label>
          <Input
            type="number"
            value={value || ""}
            onChange={(e) =>
              onChange(Number(e.target.value))
            }
          />
        </div>
      );

    case "BOOLEAN":
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value || false}
            onCheckedChange={onChange}
          />
          <label>{field.label}</label>
        </div>
      );

    case "DATE":
      return (
        <div>
          <label>{field.label}</label>
          <Input
            type="date"
            value={value || ""}
            onChange={(e) =>
              onChange(e.target.value)
            }
          />
        </div>
      );

    case "DROPDOWN":
      return (
        <div>
          <label>{field.label}</label>
          <Select
            onValueChange={onChange}
            value={value}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map(
                (opt: string) => (
                  <SelectItem
                    key={opt}
                    value={opt}
                  >
                    {opt}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return null;
  }
}
