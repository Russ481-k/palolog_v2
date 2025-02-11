import {
  Button,
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

export default function MenuSetter({
  menu,
  handleSetMenuChange,
}: {
  menu: MenuType;
  handleSetMenuChange: (e: MenuType) => void;
}) {
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
      >
        {menu}
      </Button>
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
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
                isDisabled={menu === 'TRAFFIC'}
                onClick={() => onMenuButtonClick('TRAFFIC')}
              >
                TRAFFIC
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                isDisabled={menu === 'THREAT'}
                onClick={() => onMenuButtonClick('THREAT')}
              >
                THREAT
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                isDisabled={menu === 'SYSTEM'}
                onClick={() => onMenuButtonClick('SYSTEM')}
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
}
