export default function ElevenColumnTableHeaders() {
  return (
    <div className="grid grid-cols-[repeat(11,minmax(0,1fr))] gap-2 w-full text-center font-bold items-center h-10">
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 1</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 2</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 3</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 4</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 5</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 6</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 7</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 8</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Column 9</p>
      <p className="pt-1 min-w-0 break-words flex-1 border-r">Textbox</p>
      <p className="pt-1 min-w-0 break-words flex-1">Checkbox</p>
    </div>
  );
}