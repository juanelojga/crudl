'use strict'

import _ from 'lodash'

export default function hasUnsavedChanges(formState) {
    if (!formState || formState.submitting || formState.submitSucceeded) {
        return false
    }

    return _.some(formState.registeredFields, ({ name }) => {
        const initial = _.get(formState, `initial[${name}]`)
        const value = _.get(formState, `values[${name}]`)
        const field = _.get(formState, `fields[${name}]`, { autofilled: false })
        // The field is NOT dirty when it is autofilled,
        // the initial value is the same as the field value
        // or when the initial value is not set and the value is an empty string
        return !(
            field.autofilled ||
            _.isEqual(initial, value) ||
            (typeof initial === 'undefined' && value === '')
        )
    })
}
