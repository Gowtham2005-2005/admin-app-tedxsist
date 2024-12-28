import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const data: Participant[] = [
  {
    id: "m5gr84i9",
    name: "Ken Smith",
    degree: "B.Tech",
    department: "Computer Science",
    experienceResponse: "I would engage by asking insightful questions.",
    resilienceResponse: "Resilience is about staying strong through challenges.",
    goalsResponse: "TEDxSIST can help me network and develop new ideas.",
    email: "ken.smith@example.com",
  },
  {
    id: "3u1reuv4",
    name: "Abe Jones",
    degree: "MBA",
    department: "Management",
    experienceResponse: "I would contribute by sharing case studies from my field.",
    resilienceResponse: "It's about bouncing back stronger after failures.",
    goalsResponse: "TEDxSIST will inspire me to focus on sustainable practices.",
    email: "abe.jones@tedxsist.com",
  },
  {
    id: "derv1ws0",
    name: "Monserrat Lee",
    degree: "B.A.",
    department: "Humanities",
    experienceResponse: "I would make the most of TEDx by engaging in discussions.",
    resilienceResponse: "Resilience is facing adversity with optimism.",
    goalsResponse: "TEDxSIST can help me grow my perspective on global issues.",
    email: "monserrat.lee@example.com",
  },
  {
    id: "5kma53ae",
    name: "Silas Green",
    degree: "M.Tech",
    department: "Electronics",
    experienceResponse: "I would share my technical insights to enrich discussions.",
    resilienceResponse: "It’s about adapting and growing from setbacks.",
    goalsResponse: "TEDxSIST will connect me with like-minded innovators.",
    email: "silas.green@example.com",
  },
  {
    id: "bhqecj4p",
    name: "Carmella Harris",
    degree: "Ph.D.",
    department: "Biotechnology",
    experienceResponse: "I would contribute by sharing research perspectives.",
    resilienceResponse: "Resilience means maintaining determination in the face of adversity.",
    goalsResponse: "TEDxSIST can help me expand my network and knowledge.",
    email: "carmella.harris@example.com",
  },
  {
    id: "lkjdfh38",
    name: "Lucas Bennett",
    degree: "M.A.",
    department: "Philosophy",
    experienceResponse: "I would share ethical dilemmas to provoke deeper thought.",
    resilienceResponse: "Resilience is embracing challenges and finding growth in them.",
    goalsResponse: "TEDxSIST can broaden my understanding of societal issues.",
    email: "lucas.bennett@example.com",
  },
  {
    id: "wdv3j8d0",
    name: "Elena Adams",
    degree: "B.Sc.",
    department: "Mathematics",
    experienceResponse: "I would provide mathematical insights into problem-solving.",
    resilienceResponse: "Resilience is persisting through challenges and learning from failure.",
    goalsResponse: "TEDxSIST will motivate me to apply math in real-world scenarios.",
    email: "elena.adams@example.com",
  },
  {
    id: "v9pxt6hw",
    name: "Noah Clark",
    degree: "M.Sc.",
    department: "Physics",
    experienceResponse: "I would share my experience in theoretical physics and research.",
    resilienceResponse: "Resilience is constantly pushing the boundaries of knowledge.",
    goalsResponse: "TEDxSIST will help me connect with leading researchers in my field.",
    email: "noah.clark@example.com",
  },
  {
    id: "y39ah2fp",
    name: "Sophie Turner",
    degree: "B.A.",
    department: "Psychology",
    experienceResponse: "I would explore how psychology affects personal growth and resilience.",
    resilienceResponse: "Resilience is about overcoming mental challenges and adapting.",
    goalsResponse: "TEDxSIST can open my eyes to new perspectives in psychology.",
    email: "sophie.turner@example.com",
  },
  {
    id: "o48v7g9j",
    name: "Olivia Davis",
    degree: "MBA",
    department: "Business",
    experienceResponse: "I would share leadership strategies and experiences.",
    resilienceResponse: "Resilience means maintaining a positive attitude despite obstacles.",
    goalsResponse: "TEDxSIST will inspire me to think outside the box in business.",
    email: "olivia.davis@example.com",
  },
  {
    id: "ab9nd0pz",
    name: "Ethan Harris",
    degree: "Ph.D.",
    department: "Chemistry",
    experienceResponse: "I would talk about chemical innovations that can change the world.",
    resilienceResponse: "Resilience is finding solutions even when faced with setbacks.",
    goalsResponse: "TEDxSIST will help me engage with a diverse scientific community.",
    email: "ethan.harris@example.com",
  },
  {
    id: "q3wm6z4d",
    name: "Ava Johnson",
    degree: "B.Tech",
    department: "Electrical Engineering",
    experienceResponse: "I would share the impact of electrical engineering on modern life.",
    resilienceResponse: "Resilience is about continuing to innovate despite challenges.",
    goalsResponse: "TEDxSIST will connect me with innovators in my field.",
    email: "ava.johnson@example.com",
  },
  {
    id: "jp9w7z8e",
    name: "Benjamin Moore",
    degree: "M.A.",
    department: "History",
    experienceResponse: "I would bring historical perspectives to current global issues.",
    resilienceResponse: "Resilience is learning from history to overcome present challenges.",
    goalsResponse: "TEDxSIST will inspire me to explore the past for solutions to the future.",
    email: "benjamin.moore@example.com",
  },
  {
    id: "g7ol3n5c",
    name: "Sophia Turner",
    degree: "B.A.",
    department: "Sociology",
    experienceResponse: "I would discuss how social movements shape societal norms.",
    resilienceResponse: "Resilience is pushing for change despite opposition.",
    goalsResponse: "TEDxSIST will help me expand my ideas on social change.",
    email: "sophia.turner@example.com",
  },
  {
    id: "t2az6o7y",
    name: "Mason Lee",
    degree: "M.Sc.",
    department: "Environmental Science",
    experienceResponse: "I would contribute by discussing sustainable environmental practices.",
    resilienceResponse: "Resilience is about finding sustainable solutions to environmental issues.",
    goalsResponse: "TEDxSIST can inspire me to work on innovative environmental solutions.",
    email: "mason.lee@example.com",
  },
  {
    id: "k2s6tj8x",
    name: "Isabella Scott",
    degree: "B.Tech",
    department: "Mechanical Engineering",
    experienceResponse: "I would share my experience in building efficient systems.",
    resilienceResponse: "Resilience is about constantly iterating to improve systems.",
    goalsResponse: "TEDxSIST will expose me to cutting-edge engineering ideas.",
    email: "isabella.scott@example.com",
  },
  {
    id: "w4g5rc7v",
    name: "Jacob Carter",
    degree: "M.A.",
    department: "Political Science",
    experienceResponse: "I would discuss how politics shapes public policy and social change.",
    resilienceResponse: "Resilience is fighting for what’s right in the face of adversity.",
    goalsResponse: "TEDxSIST will broaden my understanding of global political dynamics.",
    email: "jacob.carter@example.com",
  },
  {
    id: "s3j8y6pk",
    name: "Harper Wilson",
    degree: "Ph.D.",
    department: "Linguistics",
    experienceResponse: "I would share how language shapes cultural identity.",
    resilienceResponse: "Resilience is the ability to maintain one's voice amidst adversity.",
    goalsResponse: "TEDxSIST can expand my research into sociolinguistics and culture.",
    email: "harper.wilson@example.com",
  },
  {
    id: "q7m5ah3d",
    name: "William Harris",
    degree: "M.Sc.",
    department: "Biology",
    experienceResponse: "I would talk about groundbreaking biological discoveries.",
    resilienceResponse: "Resilience is pushing through scientific challenges to achieve breakthroughs.",
    goalsResponse: "TEDxSIST will allow me to connect with global biology experts.",
    email: "william.harris@example.com",
  },
  {
    id: "g8r5xp9q",
    name: "James Kim",
    degree: "B.Tech",
    department: "Civil Engineering",
    experienceResponse: "I would contribute by sharing insights on sustainable construction practices.",
    resilienceResponse: "Resilience is about designing structures that can withstand challenges.",
    goalsResponse: "TEDxSIST can help me collaborate with other innovators in the field.",
    email: "james.kim@example.com",
  },
];


export type Participant = {
  id: string
  name: string
  degree: string
  department: string
  experienceResponse: string
  resilienceResponse: string
  goalsResponse: string
  email: string
}

export const columns: ColumnDef<Participant>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div>{row.getValue("email")}</div>,
  },
  {
    accessorKey: "degree",
    header: "Degree",
    cell: ({ row }) => <div>{row.getValue("degree")}</div>,
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <div>{row.getValue("department")}</div>,
  },
  {
  accessorKey: "experienceResponse",
  header: "Experience Contribution",
  cell: ({ row }) => {
    const response = row.getValue("experienceResponse") as string;  // Type assertion
    const previewText = response.length > 10 ? `${response.slice(0, 10)}...` : response;


    return (
      <HoverCard>
        <HoverCardTrigger>
          <div>
            {previewText}{" "}
            {response.length > 20 && (
              <span className="text-red-500 underline cursor-pointer">Read more</span>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent>{response}</HoverCardContent>
      </HoverCard>
    );
  },
},
{
  accessorKey: "resilienceResponse",
  header: "What is Resilience?",
  cell: ({ row }) => {
    const response = row.getValue("resilienceResponse") as string;  // Type assertion
    const previewText = response.length > 10 ? `${response.slice(0, 10)}...` : response;


    return (
      <HoverCard>
        <HoverCardTrigger>
          <div>
            {previewText}{" "}
            {response.length > 20 && (
              <span className="text-red-500 underline cursor-pointer">Read more</span>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent>{response}</HoverCardContent>
      </HoverCard>
    );
  },
},
{
  accessorKey: "goalsResponse",
  header: "How TEDxSIST Helps",
  cell: ({ row }) => {
    const response = row.getValue("goalsResponse") as string;  // Type assertion
    const previewText = response.length > 10 ? `${response.slice(0, 10)}...` : response;


    return (
      <HoverCard>
        <HoverCardTrigger>
          <div>
            {previewText}{" "}
            {response.length > 20 && (
              <span className="text-red-500 underline cursor-pointer">Read more</span>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent>{response}</HoverCardContent>
      </HoverCard>
    );
  },
},

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const participant = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(participant.id)}>
              Copy Participant ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]

export function DataTableDemo() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4 space-x-4">
         <Input
          placeholder="Filter by names..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <Table>
        <TableHeader >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

    <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

