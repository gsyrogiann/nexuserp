declare module '@/components/ui/button' {
  import * as React from 'react';

  export const Button: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      asChild?: boolean;
      variant?: string;
      size?: string;
      className?: string;
      children?: React.ReactNode;
    } & React.RefAttributes<HTMLButtonElement>
  >;

  export function buttonVariants(args?: {
    variant?: string;
    size?: string;
    className?: string;
  }): string;
}

declare module '@/components/ui/card' {
  import * as React from 'react';

  type DivProps = React.HTMLAttributes<HTMLDivElement>;

  export const Card: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const CardHeader: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const CardTitle: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const CardDescription: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const CardContent: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const CardFooter: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/input' {
  import * as React from 'react';

  export const Input: React.ForwardRefExoticComponent<
    React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>
  >;
}

declare module '@/components/ui/badge' {
  import * as React from 'react';

  export const Badge: React.FC<
    React.HTMLAttributes<HTMLDivElement> & {
      variant?: string;
      className?: string;
      children?: React.ReactNode;
    }
  >;
}

declare module '@/components/ui/dialog' {
  import * as React from 'react';

  type DivProps = React.HTMLAttributes<HTMLDivElement>;

  export const Dialog: React.FC<{
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
  }>;
  export const DialogTrigger: React.FC<React.HTMLAttributes<HTMLElement> & { asChild?: boolean; children?: React.ReactNode }>;
  export const DialogPortal: React.FC<{ children?: React.ReactNode }>;
  export const DialogClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }>;
  export const DialogOverlay: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const DialogContent: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const DialogHeader: React.FC<DivProps>;
  export const DialogFooter: React.FC<DivProps>;
  export const DialogTitle: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const DialogDescription: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/select' {
  import * as React from 'react';

  type DivProps = React.HTMLAttributes<HTMLDivElement>;

  export const Select: React.FC<{
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }>;
  export const SelectGroup: React.FC<{ children?: React.ReactNode }>;
  export const SelectValue: React.FC<{ placeholder?: string; children?: React.ReactNode }>;
  export const SelectTrigger: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLButtonElement>>;
  export const SelectContent: React.ForwardRefExoticComponent<DivProps & { position?: string } & React.RefAttributes<HTMLDivElement>>;
  export const SelectLabel: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const SelectItem: React.ForwardRefExoticComponent<
    DivProps & { value: string; children?: React.ReactNode } & React.RefAttributes<HTMLDivElement>
  >;
  export const SelectSeparator: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const SelectScrollUpButton: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const SelectScrollDownButton: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/table' {
  import * as React from 'react';

  export const Table: React.ForwardRefExoticComponent<React.TableHTMLAttributes<HTMLTableElement> & React.RefAttributes<HTMLTableElement>>;
  export const TableHeader: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>>;
  export const TableBody: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>>;
  export const TableFooter: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>>;
  export const TableRow: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableRowElement> & React.RefAttributes<HTMLTableRowElement>>;
  export const TableHead: React.ForwardRefExoticComponent<React.ThHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>>;
  export const TableCell: React.ForwardRefExoticComponent<React.TdHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>>;
  export const TableCaption: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLTableCaptionElement> & React.RefAttributes<HTMLTableCaptionElement>>;
}

declare module '@/components/ui/textarea' {
  import * as React from 'react';

  export const Textarea: React.ForwardRefExoticComponent<
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & React.RefAttributes<HTMLTextAreaElement>
  >;
}

declare module '@/components/ui/label' {
  import * as React from 'react';

  export const Label: React.ForwardRefExoticComponent<
    React.LabelHTMLAttributes<HTMLLabelElement> & React.RefAttributes<HTMLLabelElement>
  >;
}

declare module '@/components/ui/tabs' {
  import * as React from 'react';

  type DivProps = React.HTMLAttributes<HTMLDivElement>;

  export const Tabs: React.FC<{
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    children?: React.ReactNode;
  }>;
  export const TabsList: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const TabsTrigger: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string } & React.RefAttributes<HTMLButtonElement>
  >;
  export const TabsContent: React.ForwardRefExoticComponent<DivProps & { value: string } & React.RefAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/skeleton' {
  import * as React from 'react';

  export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/context-menu' {
  import * as React from 'react';

  type DivProps = React.HTMLAttributes<HTMLDivElement>;
  type ItemProps = React.HTMLAttributes<HTMLDivElement> & {
    inset?: boolean;
    checked?: boolean;
    value?: string;
    children?: React.ReactNode;
  };

  export const ContextMenu: React.FC<{ children?: React.ReactNode }>;
  export const ContextMenuTrigger: React.FC<React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>;
  export const ContextMenuContent: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuItem: React.ForwardRefExoticComponent<ItemProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuCheckboxItem: React.ForwardRefExoticComponent<ItemProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuRadioItem: React.ForwardRefExoticComponent<ItemProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuLabel: React.ForwardRefExoticComponent<ItemProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuSeparator: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuShortcut: React.FC<React.HTMLAttributes<HTMLSpanElement>>;
  export const ContextMenuGroup: React.FC<{ children?: React.ReactNode }>;
  export const ContextMenuPortal: React.FC<{ children?: React.ReactNode }>;
  export const ContextMenuSub: React.FC<{ children?: React.ReactNode }>;
  export const ContextMenuSubContent: React.ForwardRefExoticComponent<DivProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuSubTrigger: React.ForwardRefExoticComponent<ItemProps & React.RefAttributes<HTMLDivElement>>;
  export const ContextMenuRadioGroup: React.FC<{ value?: string; onValueChange?: (value: string) => void; children?: React.ReactNode }>;
}

declare module '@/components/ui/scroll-area' {
  import * as React from 'react';

  export const ScrollArea: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
  >;
  export const ScrollBar: React.ForwardRefExoticComponent<
    React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' } & React.RefAttributes<HTMLDivElement>
  >;
}

declare module '@/components/ui/switch' {
  import * as React from 'react';

  export const Switch: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    } & React.RefAttributes<HTMLButtonElement>
  >;
}
