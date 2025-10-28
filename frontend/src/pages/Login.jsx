import React from 'react';
import { Form } from '../components'

const Login = () => {
    return (
        <Form route="api/token/" method="login"></Form>
    )
}

export default Login