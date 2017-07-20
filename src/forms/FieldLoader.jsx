/* eslint-disable react/no-unused-prop-types */
import React from 'react'
import { autofill } from 'redux-form'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { autobind } from 'core-decorators'

import asFunc from '../utils/asFunc'
import asArray from '../utils/asArray'
import { fieldShape, formFieldsShape, baseFieldPropTypes } from '../PropTypes'
import formFields from '../selectors/formFields'
import fieldComponents from '../fields'
import withPropsWatch from '../utils/withPropsWatch'
import { fieldReloaded } from '../actions/frontend'

function fieldClassName(Component) {
    let name
    if (typeof Component === 'string') {
        name = Component.toLowerCase()
    } else {
        name = (Component.displayName || Component.name).toLowerCase()
    }
    return `type-${name}`
}

@autobind
class FieldLoader extends React.Component {

    static propTypes = {
        desc: fieldShape.isRequired,
        input: baseFieldPropTypes.input,
        meta: baseFieldPropTypes.meta,
        onAdd: baseFieldPropTypes.onAdd,
        onEdit: baseFieldPropTypes.onEdit,
        registerFilterField: baseFieldPropTypes.registerFilterField,
        dispatch: React.PropTypes.func.isRequired,
        formName: React.PropTypes.string,
        fields: formFieldsShape,
        watch: React.PropTypes.func.isRequired,
        unwatch: React.PropTypes.func.isRequired,
        reload: React.PropTypes.bool,
    };

    static defaultProps = {
        disabled: false,
        readOnly: false,
        label: '',
        helpText: '',
        error: '',
        fields: {},
    };

    state = {};

    componentWillMount() {
        this.init()
    }

    init() {
        const { desc, watch, unwatch, onAdd, onEdit, dispatch } = this.props

        // Unwatch all props (relevant when reloading)
        unwatch()

        // Transform onAdd and onEdit by partial application of the desc argument
        this.onAdd = onAdd && (() => onAdd(desc))
        this.onEdit = onEdit && (() => onEdit(desc))

        // Create the field component
        if (typeof desc.field === 'string') {
            this.fieldComponent = fieldComponents[desc.field]
            if (!this.fieldComponent) {
                throw new Error(`Nonexisting field component ${desc.field} (in field descriptor ${desc.id}) `)
            }
        } else {
            this.fieldComponent = desc.field
        }

        // Watch for other fields if required
//         if (desc.onChange) {
//             asArray(desc.onChange).forEach((w) => {
//                 asArray(w.in).forEach((name) => {
//                     watch(`fields.${name}`, props => this.handleOnChange(w, props))
//                 })
//             })
//         }

        // Extend the descriptor asynchronously
        const descPromise = Promise.resolve(this.props.desc.lazy())
        descPromise.then((asyncDesc) => {
            this.setState(asyncDesc)
        })

        watch('reload', (props) => {
            if (props.reload) {
                dispatch(fieldReloaded(desc.id))
                this.init()
            }
        })
    }

    handleOnChange(onChange, props) {
        // Select a subset of the context
        const fields = asArray(onChange.in).map(name => props.fields[name])

        const result = asFunc(onChange.setProps)(...fields)

        // Set the props
        Promise.method(asFunc(onChange.setProps))(...fields)
        .then((newProps) => {
            this.setState(newProps)
        })
        .catch(e => console.error(`In 'onChange.setProps' of ${props.desc.id}:`, e))

        // Set the value
        Promise.method(asFunc(onChange.setValue))(...fields)
        .then((newValue) => {
            if (typeof newValue !== 'undefined') {
                props.dispatch(autofill(props.formName, props.desc.name, newValue))
            }
        })
        .catch(e => console.error(`In 'onChange.setValue' of ${props.desc.id}:`, e))

        // Set the initialValue
        Promise.method(asFunc(onChange.setInitialValue))(...fields)
        .then((initialValue) => {
            if (typeof initialValue !== 'undefined' && !props.fields[props.desc.name].initialValue) {
                if (!props.meta.visited || props.meta.autofilled) {
                    props.dispatch(autofill(props.formName, props.desc.name, initialValue))
                }
            }
        })
        .catch(e => console.error(`In 'onChange.setInitialValue' of ${props.desc.id}:`, e))
        return null
    }

    fieldProps() {
        return {
            // Coming from Redux Form
            input: this.props.input,
            meta: this.props.meta,
            // Coming from the Forms
            registerFilterField: this.props.registerFilterField,
            onAdd: this.onAdd, // The fixed form of this.props.onAdd (see componentWillMount)
            onEdit: this.onEdit, // The fixed form of this.props.onEdit (see componentWillMount)
            // Coming from redux
            dispatch: this.props.dispatch,
            // Coming from the field descriptor
            ...this.props.desc,
            // Dynamicaly obtained props
            ...this.state,
            // Override the field id
            id: `${this.props.formName}/${this.props.desc.id}`,
        }
    }

    render() {
        const props = this.fieldProps()
        const { disabled, readOnly, hidden, required } = props

        const fieldContainerClass = classNames('field-container', fieldClassName(this.props.desc.field),
        {
            required,
            error: this.props.meta.touched && this.props.meta.error,
            readonly: !disabled && readOnly,
            disabled,
            hidden,
        })

        return (
            <div className={fieldContainerClass}>
                { React.createElement(this.fieldComponent, { ...props }) }
            </div>
        )
    }
}

function mapStateToProps(state, ownProps) {
    return {
        fields: formFields(ownProps.formName)(state),
        reload: state.frontend.reload[ownProps.desc.id],
    }
}

export default connect(mapStateToProps)(withPropsWatch(FieldLoader))
