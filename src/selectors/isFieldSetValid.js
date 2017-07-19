'use strict';

import { isValid } from 'redux-form'
import _ from 'lodash'

export default function isFieldSetValid(formName, fieldNames) {
    return (state) => {
        const formState = _.get(state, `form.${formName}`)
        const registeredFields = _.get(formState, 'registeredFields', [])
        const subState = {
            form: {
                [formName]: Object.assign({}, formState, {
                    error: undefined,
                    syncError: false,
                    registeredFields: _.filter(registeredFields, ({ name }) => fieldNames.indexOf(name) >= 0)
                }),
            },
        }
        return isValid(formName)(subState)
    }
}
