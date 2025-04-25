import { Checkbox } from "./ui/checkbox";

export default function OrderHeaders({ headers }: { headers: string[] }) {
  return (
    <div className="grid grid-cols-12 gap-1 w-full flex-nowrap text-center font-bold h-10">
      {headers.map((header, index) => (
        <p
          key={index}
          className={
            index === 0 || index === headers.length - 1
              ? "pt-1 min-w-0 break-words flex-1 border-r col-span-2"
              : index === headers.length - 1
              ? "pt-1 min-w-0 break-words flex-1 border-r col-span-2"
              : "pt-1 min-w-0 break-words flex-1 border-r"
          }
        >
          {header}
        </p>
      ))}
      {/* <span className="pt-1 min-w-0 break-words flex-1 flex items-center justify-center">
        <Checkbox />
      </span> */}
    </div>
  );
}
