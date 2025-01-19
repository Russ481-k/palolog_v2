import { t } from 'i18next';
import { z } from 'zod';

export const zu = {
  string: {
    nonEmpty(s, options = {}) {
      var _a;
      return s
        .trim()
        .min(
          1,
          (_a = options.invalid_type_error) !== null && _a !== void 0
            ? _a
            : t('zod:errors.invalid_type_received_undefined')
        );
    },
    nonEmptyOptional(s, options = {}) {
      return z
        .literal('')
        .transform(() => undefined)
        .or(zu.string.nonEmpty(s, options).optional());
    },
    email(s, options = {}) {
      return zu.string
        .nonEmpty(s.toLowerCase(), options)
        .email(options.invalid_type_error);
    },
    emailOptional(s, options = {}) {
      return zu.string.nonEmptyOptional(zu.string.email(s, options), options);
    },
  },
  array: {
    nonEmpty(a, message) {
      return a.min(
        1,
        message !== null && message !== void 0
          ? message
          : t('zod:errors.invalid_type_received_undefined')
      );
    },
    nonEmptyOptional(a, message) {
      return a
        .transform((v) => (v.length === 0 ? undefined : v))
        .pipe(zu.array.nonEmpty(a, message).optional())
        .optional();
    },
  },
};
