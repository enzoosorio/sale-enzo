
interface FiltersProps {
    categorySelected: string;
    availableFilters: React.ReactElement[];
}

export const Filters = ({ availableFilters }: FiltersProps) => {
  
    return (
    <div className='flex h-full mt-20 flex-col items-center justify-center w-max gap-4'>
        {availableFilters.map((filter, index) => (
            <div key={index}>
                {filter}
            </div>
        ))}
    </div>
  )
}
