import clsx from "clsx";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectIsUsersListOpen } from "../../features/ui/selectors";
import { uiSlice } from "../../features/ui/uiSlice";

export function CollapseButton() {
  const isOpen = useAppSelector(selectIsUsersListOpen);
  const dispatch = useAppDispatch();
  const toggle = () => dispatch(uiSlice.actions.setUsersListIsOpen(!isOpen));

  return (
    <div
      onClick={toggle}
      className="relative cursor-pointer rounded-md p-1 transition-[colors,transform] duration-200 hover:bg-white/10 active:scale-90"
    >
      <PanelRightOpen
        size={24}
        className={clsx(
          "absolute inset-0 m-auto transition-all duration-300 ease-in-out",
          isOpen
            ? "opacity-100 transform-[rotateY(0deg)]"
            : "opacity-0 transform-[rotateY(90deg)]",
        )}
      />
      <PanelLeftOpen
        size={24}
        className={clsx(
          "transition-all duration-300 ease-in-out",
          isOpen
            ? "opacity-0 transform-[rotateY(-90deg)]"
            : "opacity-100 transform-[rotateY(0deg)]",
        )}
      />
    </div>
  );
}
