import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectIsUsersListOpen } from "../../features/ui/selectors";
import { uiSlice } from "../../features/ui/uiSlice";

export function CollapseButton() {
  const isOpen = useAppSelector(selectIsUsersListOpen);
  const dispatch = useAppDispatch();
  const toggle = () => dispatch(uiSlice.actions.setUsersListIsOpen(!isOpen));

  if (isOpen) {
    return (
      <PanelRightOpen onClick={toggle} className="cursor-pointer" size={24} />
    );
  }
  return (
    <PanelLeftOpen onClick={toggle} className="cursor-pointer" size={24} />
  );
}
