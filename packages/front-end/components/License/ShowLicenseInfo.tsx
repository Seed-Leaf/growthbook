import { FC } from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";

const ShowLicenseInfo: FC<{ showInput?: boolean }> = () => (
  <Box mt="4" pt="4">
    <Flex gap="4">
      <Box width="220px">
        <Heading as="h4" size="4">
          Plan
        </Heading>
      </Box>
      <Box>
        <Text weight="medium">Enterprise</Text>
        <Text as="p" color="gray">
          Enterprise features are enabled. No license key is required.
        </Text>
      </Box>
    </Flex>
  </Box>
);

export default ShowLicenseInfo;
