"use client";

import * as React from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "All" },
  { id: "t-shirts", label: "T-Shirts" },
  { id: "shirts", label: "Shirts" },
  { id: "hoodies", label: "Hoodies" },
  { id: "jackets", label: "Jackets" },
  { id: "sweaters", label: "Sweaters" },
];

const filters = [
  {
    id: "brand",
    name: "Brand",
    options: [
      { id: "brand-nike", label: "Nike", checked: true },
      { id: "brand-adidas", label: "Adidas", checked: true },
      { id: "brand-puma", label: "Puma", checked: false },
      { id: "brand-reebok", label: "Reebok", checked: false },
      { id: "brand-newbalance", label: "New Balance", checked: false },
    ],
  },
  {
    id: "material",
    name: "Material",
    options: [
      { id: "material-cotton", label: "Cotton", checked: true },
      { id: "material-polyester", label: "Polyester", checked: false },
      { id: "material-wool", label: "Wool", checked: false },
      { id: "material-linen", label: "Linen", checked: false },
    ],
  },
  {
    id: "fit",
    name: "Fit",
    options: [
      { id: "fit-regular", label: "Regular Fit", checked: false },
      { id: "fit-slim", label: "Slim Fit", checked: true },
      { id: "fit-relaxed", label: "Relaxed Fit", checked: false },
      { id: "fit-oversized", label: "Oversized", checked: false },
    ],
  },
  {
    id: "price",
    name: "Price Range",
    options: [
      { id: "price-0-50", label: "Under $50", checked: false },
      { id: "price-50-100", label: "$50 - $100", checked: true },
      { id: "price-100-150", label: "$100 - $150", checked: false },
      { id: "price-150", label: "Over $150", checked: false },
    ],
  },
];

const colorOptions = [
  { id: "color-black", label: "Black", checked: false },
  { id: "color-white", label: "White", checked: false },
  { id: "color-red", label: "Red", checked: false },
  { id: "color-blue", label: "Blue", checked: false },
  { id: "color-green", label: "Green", checked: false },
  { id: "color-yellow", label: "Yellow", checked: false },
];

const sizeOptions = [
  { id: "size-xxs", label: "XXS", checked: false },
  { id: "size-xs", label: "XS", checked: false },
  { id: "size-s", label: "S", checked: false },
  { id: "size-m", label: "M", checked: false },
  { id: "size-l", label: "L", checked: false },
  { id: "size-xl", label: "XL", checked: false },
  { id: "size-xxl", label: "XXL", checked: false },
  { id: "size-xxxl", label: "XXXL", checked: false },
];

interface FiltersContentProps {
  showClearButton?: boolean;
  totalActiveFilters: number;
  handleClearAll: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCategories: Array<{ id: string; label: string }>;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredFilters: typeof filters;
  openFilters: Record<string, boolean>;
  setOpenFilters: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  getSelectedCount: (filterId: string) => number;
  filterSelections: Record<string, boolean>;
  handleCheckboxChange: (id: string, checked: boolean) => void;
  filteredColors: typeof colorOptions;
  getSelectedColorCount: () => number;
  filteredSizes: typeof sizeOptions;
  getSelectedSizeCount: () => number;
}

const FiltersContent = React.memo(
  ({
    showClearButton = true,
    totalActiveFilters,
    handleClearAll,
    searchQuery,
    setSearchQuery,
    filteredCategories,
    selectedCategory,
    setSelectedCategory,
    filteredFilters,
    openFilters,
    setOpenFilters,
    getSelectedCount,
    filterSelections,
    handleCheckboxChange,
    filteredColors,
    getSelectedColorCount,
    filteredSizes,
    getSelectedSizeCount,
  }: FiltersContentProps) => {
    return (
      <>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-xl font-medium">
              Filters ({totalActiveFilters})
            </h2>
            {showClearButton && (
              <Button variant="secondary" size="sm" onClick={handleClearAll}>
                Clear all
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search filters"
              className="h-9 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <nav className="flex flex-col gap-2">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "text-left text-base leading-6 font-medium",
                  selectedCategory === category.id
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {category.label}
              </button>
            ))}
          </nav>
        </div>

        <Separator />

        {/* Checkbox Filters */}
        {filteredFilters.map((filter) => (
          <Collapsible
            key={filter.id}
            open={openFilters[filter.id]}
            onOpenChange={(open) =>
              setOpenFilters((prev) => ({ ...prev, [filter.id]: open }))
            }
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between pb-6">
              <h3 className="text-base leading-6 font-semibold">
                {filter.name.split(" (")[0]} ({getSelectedCount(filter.id)})
              </h3>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-5 transition-transform duration-200",
                  openFilters[filter.id] && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pb-6">
              <div className="flex flex-col gap-3">
                {filter.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Checkbox
                      id={option.id}
                      checked={filterSelections[option.id]}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(option.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={option.id}
                      className="text-sm leading-none font-medium"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}

        {/* Color Filter */}
        <Collapsible
          open={openFilters.color}
          onOpenChange={(open) =>
            setOpenFilters((prev) => ({ ...prev, color: open }))
          }
        >
          <CollapsibleTrigger className="group flex w-full items-center justify-between pb-6">
            <h3 className="text-base leading-6 font-semibold">
              Color{" "}
              {getSelectedColorCount() > 0 && `(${getSelectedColorCount()})`}
            </h3>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-5 transition-transform duration-200",
                openFilters.color && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-6">
            <div className="flex flex-col gap-3">
              {filteredColors.map((color) => (
                <div key={color.id} className="flex items-center gap-2">
                  <Checkbox
                    id={color.id}
                    checked={filterSelections[color.id]}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(color.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={color.id}
                    className="text-sm leading-none font-medium"
                  >
                    {color.label}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Size Filter */}
        <Collapsible
          open={openFilters.size}
          onOpenChange={(open) =>
            setOpenFilters((prev) => ({ ...prev, size: open }))
          }
        >
          <CollapsibleTrigger className="group flex w-full items-center justify-between pb-6">
            <h3 className="text-base leading-6 font-semibold">
              Size {getSelectedSizeCount() > 0 && `(${getSelectedSizeCount()})`}
            </h3>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-5 transition-transform duration-200",
                openFilters.size && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pb-6">
            <div className="flex flex-col gap-3">
              {filteredSizes.map((size) => (
                <div key={size.id} className="flex items-center gap-2">
                  <Checkbox
                    id={size.id}
                    checked={filterSelections[size.id]}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(size.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={size.id}
                    className="text-sm leading-none font-medium"
                  >
                    {size.label}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </>
    );
  },
);

FiltersContent.displayName = "FiltersContent";

interface ProductListFilters1Props {
  categoryName?: string;
  children?: React.ReactNode;
}

export default function ProductListFilters1({
  categoryName = "Category name",
  children,
}: ProductListFilters1Props) {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("name-asc");
  const [openFilters, setOpenFilters] = React.useState<Record<string, boolean>>(
    {
      ...Object.fromEntries(filters.map((f) => [f.id, true])),
      color: true,
      size: true,
    },
  );

  // Track filter selections
  const [filterSelections, setFilterSelections] = React.useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    filters.forEach((filter) => {
      filter.options.forEach((option) => {
        initial[option.id] = option.checked;
      });
    });
    colorOptions.forEach((option) => {
      initial[option.id] = option.checked;
    });
    sizeOptions.forEach((option) => {
      initial[option.id] = option.checked;
    });
    return initial;
  });

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setFilterSelections((prev) => ({ ...prev, [id]: checked }));
  };

  const handleClearAll = () => {
    const cleared: Record<string, boolean> = {};
    filters.forEach((filter) => {
      filter.options.forEach((option) => {
        cleared[option.id] = false;
      });
    });
    colorOptions.forEach((option) => {
      cleared[option.id] = false;
    });
    sizeOptions.forEach((option) => {
      cleared[option.id] = false;
    });
    setFilterSelections(cleared);
    setSearchQuery("");
  };

  // Count selected filters per category
  const getSelectedCount = (filterId: string) => {
    const filter = filters.find((f) => f.id === filterId);
    if (!filter) return 0;
    return filter.options.filter((opt) => filterSelections[opt.id]).length;
  };

  // Count selected colors
  const getSelectedColorCount = () => {
    return colorOptions.filter((opt) => filterSelections[opt.id]).length;
  };

  // Count selected sizes
  const getSelectedSizeCount = () => {
    return sizeOptions.filter((opt) => filterSelections[opt.id]).length;
  };

  // Count total active filters
  const totalActiveFilters = React.useMemo(() => {
    return Object.values(filterSelections).filter(Boolean).length;
  }, [filterSelections]);

  // Filter categories and options based on search
  const filteredFilters = React.useMemo(() => {
    if (!searchQuery) return filters;

    return filters
      .map((filter) => ({
        ...filter,
        options: filter.options.filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((filter) => filter.options.length > 0);
  }, [searchQuery]);

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery) return categories;
    return categories.filter((cat) =>
      cat.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const filteredColors = React.useMemo(() => {
    if (!searchQuery) return colorOptions;
    return colorOptions.filter((color) =>
      color.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const filteredSizes = React.useMemo(() => {
    if (!searchQuery) return sizeOptions;
    return sizeOptions.filter((size) =>
      size.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const getSortLabel = () => {
    switch (sortBy) {
      case "name-asc":
        return "Name (A-Z)";
      case "name-desc":
        return "Name (Z-A)";
      case "price-asc":
        return "Price (Low to High)";
      case "price-desc":
        return "Price (High to Low)";
      default:
        return "Sort by";
    }
  };

  return (
    <div className="bg-background flex flex-col items-center gap-6 py-16 lg:py-24">
      <div className="container-padding-x mx-auto flex w-full max-w-7xl flex-col gap-16">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-3 lg:gap-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <h1 className="text-foreground heading-lg">{categoryName}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {getSortLabel()}
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={setSortBy}
                  >
                    <DropdownMenuRadioItem value="name-asc">
                      Name (A-Z)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name-desc">
                      Name (Z-A)
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="price-asc">
                      Price (Low to High)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price-desc">
                      Price (High to Low)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Filters Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full gap-2 lg:hidden">
                  <SlidersHorizontal className="size-4" />
                  Filters ({totalActiveFilters})
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-full flex-col p-0 sm:max-w-md"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Filters for the product list
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex flex-col gap-6">
                    <FiltersContent
                      showClearButton={false}
                      totalActiveFilters={totalActiveFilters}
                      handleClearAll={handleClearAll}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      filteredCategories={filteredCategories}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      filteredFilters={filteredFilters}
                      openFilters={openFilters}
                      setOpenFilters={setOpenFilters}
                      getSelectedCount={getSelectedCount}
                      filterSelections={filterSelections}
                      handleCheckboxChange={handleCheckboxChange}
                      filteredColors={filteredColors}
                      getSelectedColorCount={getSelectedColorCount}
                      filteredSizes={filteredSizes}
                      getSelectedSizeCount={getSelectedSizeCount}
                    />
                  </div>
                </div>
                <div className="border-t p-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex flex-col gap-10 lg:flex-row">
              {/* Filters Sidebar - Desktop Only */}
              <aside className="hidden w-80 flex-col gap-6 lg:flex">
                <FiltersContent
                  showClearButton={true}
                  totalActiveFilters={totalActiveFilters}
                  handleClearAll={handleClearAll}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filteredCategories={filteredCategories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  filteredFilters={filteredFilters}
                  openFilters={openFilters}
                  setOpenFilters={setOpenFilters}
                  getSelectedCount={getSelectedCount}
                  filterSelections={filterSelections}
                  handleCheckboxChange={handleCheckboxChange}
                  filteredColors={filteredColors}
                  getSelectedColorCount={getSelectedColorCount}
                  filteredSizes={filteredSizes}
                  getSelectedSizeCount={getSelectedSizeCount}
                />
              </aside>

              {/* Main Content Area */}
              <main className="flex-1">
                {children || (
                  <div className="flex h-full items-center justify-center rounded-lg border border-purple-500/50 bg-purple-500/10 px-6 py-6">
                    <p className="text-foreground text-center text-sm">
                      Slot (swap it with your content)
                    </p>
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
