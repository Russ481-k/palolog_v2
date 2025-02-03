import {
  Button,
  ButtonGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  useDisclosure,
} from '@chakra-ui/react';

import { MenuType } from '@/types/project';

interface MenuSetterProps {
  menu: MenuType;
  handleSetMenuChange: (menu: MenuType) => void;
  disabled?: boolean;
}

const MenuSetter = ({
  menu,
  handleSetMenuChange,
  disabled,
}: MenuSetterProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const onMenuButtonClick = (e: MenuType) => {
    handleSetMenuChange(e);
    onClose();
  };

  return (
    <Flex>
      <Button
        fontSize="18px"
        size="xs"
        color="gray.400"
        borderWidth={0}
        borderRadius={4}
        onClick={onOpen}
        isDisabled={disabled}
        _disabled={{
          cursor: 'not-allowed',
          opacity: 0.6,
        }}
      >
        {menu}
      </Button>
      <Drawer isOpen={isOpen && !disabled} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Monitoring Menu</DrawerHeader>
          <DrawerBody>
            <Flex flexDir="column" gap={2}>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                isDisabled={disabled}
                onClick={() => onMenuButtonClick('TRAFFIC')}
                colorScheme={menu === 'TRAFFIC' ? 'blue' : 'gray'}
                _disabled={{
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                TRAFFIC
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                isDisabled={disabled}
                onClick={() => onMenuButtonClick('THREAT')}
                colorScheme={menu === 'THREAT' ? 'blue' : 'gray'}
                _disabled={{
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                THREAT
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                isDisabled={disabled}
                onClick={() => onMenuButtonClick('SYSTEM')}
                colorScheme={menu === 'SYSTEM' ? 'blue' : 'gray'}
                _disabled={{
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
              >
                SYSTEM
              </Button>
            </Flex>
          </DrawerBody>
          <DrawerFooter></DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
};

MenuSetter.displayName = 'MenuSetter';

export default MenuSetter;
