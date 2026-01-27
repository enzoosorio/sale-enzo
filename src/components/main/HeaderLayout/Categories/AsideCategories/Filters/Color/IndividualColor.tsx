
interface IndividualColorProps {
    color : string;
}

export const IndividualColor = ({ color }: IndividualColorProps) => {
  return (
    <div className='p-1 min-w-12 min-h-12 px-4 flex items-center justify-center font-inria text-sm cursor-pointer relative overflow-hidden group'>
        <span className="absolute inset-0 gradial-radient" />
        <div className={`rounded-full w-full h-full ${color} shadow hover:overlay-fade-drop`}/>
    </div>
  )
}
