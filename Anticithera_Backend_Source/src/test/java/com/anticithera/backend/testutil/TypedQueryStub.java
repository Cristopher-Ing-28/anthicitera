package com.anticithera.backend.testutil;

import jakarta.persistence.*;

import java.util.*;

public class TypedQueryStub<T> implements TypedQuery<T> {

    private final Object singleResult;
    private final List<T> resultList;
    private final RuntimeException exceptionToThrow;

    public TypedQueryStub(Object singleResult, List<?> resultList, RuntimeException exceptionToThrow) {
        this.singleResult = singleResult;
        this.resultList = (List<T>) resultList;
        this.exceptionToThrow = exceptionToThrow;
    }

    @Override
    public List<T> getResultList() {
        if (exceptionToThrow != null) throw exceptionToThrow;
        return resultList != null ? resultList : new ArrayList<>();
    }

    @Override
    public T getSingleResult() {
        if (exceptionToThrow != null) throw exceptionToThrow;
        if (singleResult == null) throw new NoResultException();
        return (T) singleResult;
    }

    @Override
    public TypedQuery<T> setParameter(String name, Object value) { return this; }

    @Override public TypedQuery<T> setParameter(Parameter parameter, Object value) { return this; }
    @Override public TypedQuery<T> setParameter(Parameter parameter, Calendar value, TemporalType temporalType) { return this; }
    @Override public TypedQuery<T> setParameter(Parameter parameter, Date value, TemporalType temporalType) { return this; }
    @Override public TypedQuery<T> setParameter(String name, Calendar value, TemporalType temporalType) { return this; }
    @Override public TypedQuery<T> setParameter(String name, Date value, TemporalType temporalType) { return this; }
    @Override public TypedQuery<T> setParameter(int position, Object value) { return this; }
    @Override public TypedQuery<T> setParameter(int position, Calendar value, TemporalType temporalType) { return this; }
    @Override public TypedQuery<T> setParameter(int position, Date value, TemporalType temporalType) { return this; }
    @Override public Set<Parameter<?>> getParameters() { return null; }
    @Override public Parameter<?> getParameter(String name) { return null; }
    @Override public <T1> Parameter<T1> getParameter(String name, Class<T1> type) { return null; }
    @Override public Parameter<?> getParameter(int position) { return null; }
    @Override public <T1> Parameter<T1> getParameter(int position, Class<T1> type) { return null; }
    @Override public boolean isBound(Parameter<?> parameter) { return false; }
    @Override public <T1> T1 getParameterValue(Parameter<T1> parameter) { return null; }
    @Override public Object getParameterValue(String name) { return null; }
    @Override public Object getParameterValue(int position) { return null; }
    @Override public TypedQuery<T> setFlushMode(FlushModeType flushMode) { return this; }
    @Override public FlushModeType getFlushMode() { return null; }
    @Override public TypedQuery<T> setLockMode(LockModeType lockMode) { return this; }
    @Override public LockModeType getLockMode() { return null; }
    @Override public <T1> T1 unwrap(Class<T1> cls) { return null; }
    @Override public int executeUpdate() { return 0; }
    @Override public TypedQuery<T> setMaxResults(int maxResult) { return this; }
    @Override public int getMaxResults() { return 0; }
    @Override public TypedQuery<T> setFirstResult(int startPosition) { return this; }
    @Override public int getFirstResult() { return 0; }
    @Override public TypedQuery<T> setHint(String hintName, Object value) { return this; }
    @Override public Map<String, Object> getHints() { return null; }
}
