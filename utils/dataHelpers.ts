
export const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    } else if (data !== null && typeof data === 'object') {
        // Handle Date objects and Firestore Timestamps
        if (data instanceof Date) return data;
        if (data.toDate && typeof data.toDate === 'function') return data; 

        const newObj: any = {};
        Object.keys(data).forEach(key => {
            const val = data[key];
            if (val === undefined) {
                newObj[key] = null; // Convert undefined to null for Firestore
            } else {
                newObj[key] = sanitizeData(val);
            }
        });
        return newObj;
    }
    return data;
};
