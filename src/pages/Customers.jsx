import React from 'react';
import { useMutation } from '@apollo/client';
import DELETE_CUSTOMER from '../graphql/mutations/deleteCustomer';

const CustomerDetails = ({ customer }) => {
    const [deleteCustomer] = useMutation(DELETE_CUSTOMER);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            await deleteCustomer({ variables: { id: customer.id } });
            alert('Customer deleted successfully!');
        }
    };

    return (
        <div className="customer-detail">
            <h2>{customer.name}</h2>
            <p>{customer.email}</p>
            {/* Other customer details */}
            <button onClick={handleDelete} className="delete-button">Delete Customer</button>
        </div>
    );
};

export default CustomerDetails;