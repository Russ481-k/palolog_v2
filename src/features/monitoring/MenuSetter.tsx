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

export default function MenuSetter({
  menu,
  handleSetMenuChange,
}: {
  menu: 'TRAFFIC' | 'TREAT' | 'SYSLOG' | 'WILDFIRE';
  handleSetMenuChange: (e: 'TRAFFIC' | 'TREAT' | 'SYSLOG' | 'WILDFIRE') => void;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const onMenuButtonClick = (
    e: 'TRAFFIC' | 'TREAT' | 'SYSLOG' | 'WILDFIRE'
  ) => {
    handleSetMenuChange(e);
    onClose();
  };

  return (
    <Flex>
      <Button
        fontSize="24px"
        size="sm"
        color="gray.400"
        borderWidth={0}
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
                disabled={menu === 'TRAFFIC'}
                onClick={() => onMenuButtonClick('TRAFFIC')}
              >
                TRAFFIC
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                disabled={menu === 'TREAT'}
                onClick={() => onMenuButtonClick('TREAT')}
              >
                TREAT
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                disabled={menu === 'SYSLOG'}
                onClick={() => onMenuButtonClick('SYSLOG')}
              >
                SYSLOG
              </Button>
              <Button
                fontSize="18px"
                size="sm"
                p={4}
                disabled={menu === 'WILDFIRE'}
                onClick={() => onMenuButtonClick('WILDFIRE')}
              >
                WILDFIRE
              </Button>
            </Flex>
          </DrawerBody>

          <DrawerFooter>
            {/* <Button variant="outline" mr={3} onClick={onClose}>
                          Cancel
                        </Button>
                        <Button colorScheme="blue">Save</Button> */}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}
