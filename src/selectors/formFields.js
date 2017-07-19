'use strict'

import _ from 'lodash'

export default function formFields(formName) {
    return (state) => {
        const form = state.form[formName]
        if (form) {
            const registeredFields = _.get(form, 'registeredFields', [])
            const result = _.reduce(registeredFields, (fields, { name }, key) => {
                return Object.assign(fields, {
                    [name]: {
                        value: _.get(form.values, name),
                        initialValue: _.get(form.initial, name),
                        ..._.get(form.fields, name)
                    }
                })
            }, {})
            return result
        }
        return {}
    }
}
