import { Logger } from '@nestjs/common';

// Keep unit-test output focused on assertions, not application logs.
Logger.overrideLogger(false);
